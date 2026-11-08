<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\Guardian;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\StudentClassAssignment;
use App\Support\Import\SpreadsheetReader;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * Bulk student import from CSV / XLSX / XLS.
 *
 * Expected columns (header names, accents/case-insensitive):
 *   nom*, prenom*, date_naissance* (Y-m-d or d/m/Y), sexe* (M/F),
 *   classe, responsable_nom, responsable_prenom, responsable_telephone,
 *   responsable_email.
 *
 * Every row is validated and errors are collected field-by-field (the import
 * does not stop on the first bad row). Valid rows are inserted; rows with
 * validation errors are skipped. All inserts run inside one transaction — an
 * unexpected (critical) failure rolls the whole batch back.
 *
 * @phpstan-type ImportError array{row: int, field: string, message: string}
 */
class StudentImportService
{
    public function __construct(private readonly SpreadsheetReader $reader) {}

    /**
     * @return array{inserted: int, skipped: int, errors: list<ImportError>}
     */
    public function import(UploadedFile $file): array
    {
        $parsed = $this->reader->read($file);
        $rows = $parsed['rows'];

        if ($rows === []) {
            return [
                'inserted' => 0,
                'skipped' => 0,
                'errors' => [['row' => 0, 'field' => 'file', 'message' => 'Le fichier est vide ou illisible.']],
            ];
        }

        $activeYear = SchoolYear::query()->where('is_current', true)->first();

        /** @var list<ImportError> $errors */
        $errors = [];
        $inserted = 0;
        $skipped = 0;

        // Pre-compute code counters once so generated codes stay unique within
        // the batch without a DB round-trip per row.
        $codeState = ['student' => $this->initialSequence('student'), 'enrollment' => $this->initialSequence('enrollment')];

        try {
            DB::transaction(function () use ($rows, $activeYear, &$errors, &$inserted, &$skipped, &$codeState): void {
                foreach ($rows as $row) {
                    $line = $row['line'];
                    $v = $row['values'];

                    if ($this->rowIsEmpty($v)) {
                        $skipped++;

                        continue;
                    }

                    $rowErrors = $this->validateRow($v, $line, $activeYear);
                    if ($rowErrors !== []) {
                        foreach ($rowErrors as $e) {
                            $errors[] = $e;
                        }
                        $skipped++;

                        continue;
                    }

                    $this->insertStudent($v, $activeYear, $codeState);
                    $inserted++;
                }
            });
        } catch (\Throwable $e) {
            // Critical failure → the transaction rolled everything back.
            return [
                'inserted' => 0,
                'skipped' => 0,
                'errors' => [[
                    'row' => 0,
                    'field' => 'global',
                    'message' => 'Import annulé suite à une erreur critique : '.$e->getMessage(),
                ]],
            ];
        }

        return ['inserted' => $inserted, 'skipped' => $skipped, 'errors' => $errors];
    }

    /**
     * @param  array<string, string>  $v
     * @return list<array{row: int, field: string, message: string}>
     */
    private function validateRow(array $v, int $line, ?SchoolYear $activeYear): array
    {
        $errors = [];

        if (($v['nom'] ?? '') === '') {
            $errors[] = ['row' => $line, 'field' => 'nom', 'message' => 'Le nom est obligatoire.'];
        }
        if (($v['prenom'] ?? '') === '') {
            $errors[] = ['row' => $line, 'field' => 'prenom', 'message' => 'Le prénom est obligatoire.'];
        }

        $rawDate = $v['date_naissance'] ?? '';
        if ($rawDate === '') {
            $errors[] = ['row' => $line, 'field' => 'date_naissance', 'message' => 'La date de naissance est obligatoire.'];
        } elseif ($this->parseDate($rawDate) === null) {
            $errors[] = ['row' => $line, 'field' => 'date_naissance', 'message' => 'Date invalide (attendu AAAA-MM-JJ ou JJ/MM/AAAA).'];
        }

        $sexe = $this->normalizeGender($v['sexe'] ?? '');
        if (($v['sexe'] ?? '') === '') {
            $errors[] = ['row' => $line, 'field' => 'sexe', 'message' => 'Le sexe est obligatoire.'];
        } elseif ($sexe === null) {
            $errors[] = ['row' => $line, 'field' => 'sexe', 'message' => 'Sexe invalide (attendu M ou F).'];
        }

        $classe = $v['classe'] ?? '';
        if ($classe !== '') {
            if (! $activeYear) {
                $errors[] = ['row' => $line, 'field' => 'classe', 'message' => 'Aucune année scolaire active : inscription impossible.'];
            } elseif ($this->findClass($classe, $activeYear->id) === null) {
                $errors[] = ['row' => $line, 'field' => 'classe', 'message' => "Classe « {$classe} » introuvable pour l’année active."];
            }
        }

        $email = $v['responsable_email'] ?? '';
        if ($email !== '' && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = ['row' => $line, 'field' => 'responsable_email', 'message' => 'Email du responsable invalide.'];
        }

        return $errors;
    }

    /**
     * @param  array<string, string>  $v
     * @param  array{student: int, enrollment: int}  $codeState
     */
    private function insertStudent(array $v, ?SchoolYear $activeYear, array &$codeState): void
    {
        $classe = $v['classe'] ?? '';
        $class = ($classe !== '' && $activeYear) ? $this->findClass($classe, $activeYear->id) : null;

        $student = Student::query()->create([
            'student_code' => $this->nextCode('student', $codeState),
            'first_name' => $v['prenom'],
            'last_name' => $v['nom'],
            'gender' => $this->normalizeGender($v['sexe'] ?? ''),
            'date_of_birth' => $this->parseDate($v['date_naissance'] ?? ''),
            'status' => $class ? 'active' : 'pending',
        ]);

        if ($class && $activeYear) {
            Enrollment::query()->create([
                'student_id' => $student->id,
                'school_year_id' => $activeYear->id,
                'class_id' => $class->id,
                'enrollment_number' => $this->nextCode('enrollment', $codeState),
                'enrollment_date' => now()->toDateString(),
                'academic_status' => 'enrolled',
                'admission_type' => 'new',
                'registration_status' => 'validated',
            ]);

            StudentClassAssignment::query()->create([
                'student_id' => $student->id,
                'class_id' => $class->id,
                'school_year_id' => $activeYear->id,
                'assignment_date' => now()->toDateString(),
                'status' => 'active',
            ]);
        }

        $this->linkGuardian($student, $v);
    }

    /**
     * Find-or-create a guardian from the responsable_* columns and link it to
     * the student. No-op when no guardian name is provided.
     *
     * @param  array<string, string>  $v
     */
    private function linkGuardian(Student $student, array $v): void
    {
        $lastName = $v['responsable_nom'] ?? '';
        $firstName = $v['responsable_prenom'] ?? '';
        $phone = $v['responsable_telephone'] ?? '';
        $email = $v['responsable_email'] ?? '';

        if ($lastName === '' && $firstName === '') {
            return;
        }

        $existing = null;
        if ($email !== '') {
            $existing = Guardian::query()->where('email', $email)->first();
        }
        if (! $existing && $phone !== '') {
            $existing = Guardian::query()->where('phone', $phone)->first();
        }

        $guardian = $existing ?? Guardian::query()->create([
            'first_name' => $firstName !== '' ? $firstName : '—',
            'last_name' => $lastName !== '' ? $lastName : '—',
            'relationship_type' => 'guardian',
            'phone' => $phone !== '' ? $phone : null,
            'email' => $email !== '' ? $email : null,
            'is_primary_contact' => true,
        ]);

        $alreadyLinked = $student->guardians()
            ->where('guardians.id', $guardian->id)
            ->exists();

        if (! $alreadyLinked) {
            // Use the relation's attach() (matches GuardianController): the
            // pivot table has no updated_at, so a Pivot::create() would fail.
            $student->guardians()->attach($guardian->id, [
                'is_legal_guardian' => true,
                'can_receive_notifications' => true,
                'can_pickup_student' => true,
                'is_primary_contact' => true,
            ]);
        }
    }

    private function findClass(string $name, int $schoolYearId): ?SchoolClass
    {
        return SchoolClass::query()
            ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($name))])
            ->where('school_year_id', $schoolYearId)
            ->first();
    }

    private function parseDate(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }

        foreach (['Y-m-d', 'd/m/Y', 'd-m-Y', 'Y/m/d'] as $format) {
            try {
                // Leading '!' zeroes the time; strict round-trip check rejects
                // values like "2015-13-40" that DateTime would otherwise coerce.
                $d = CarbonImmutable::createFromFormat('!'.$format, $raw);
            } catch (\Throwable) {
                continue;
            }
            if ($d !== false && $d->format($format) === $raw) {
                return $d->format('Y-m-d');
            }
        }

        return null;
    }

    private function normalizeGender(string $raw): ?string
    {
        return match (mb_strtolower(trim($raw))) {
            'm', 'male', 'masculin', 'garcon', 'garçon', 'h' => 'male',
            'f', 'female', 'feminin', 'féminin', 'fille' => 'female',
            default => null,
        };
    }

    /**
     * @param  array<string, string>  $v
     */
    private function rowIsEmpty(array $v): bool
    {
        foreach ($v as $cell) {
            if (trim($cell) !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * Highest existing trailing sequence for this year's codes.
     */
    private function initialSequence(string $kind): int
    {
        $year = (int) date('Y');
        if ($kind === 'student') {
            $prefix = 'EPB-'.$year.'-';
            $last = Student::query()->where('student_code', 'like', $prefix.'%')
                ->orderByDesc('student_code')->value('student_code');
        } else {
            $prefix = 'INS-'.$year.'-';
            $last = Enrollment::query()->where('enrollment_number', 'like', $prefix.'%')
                ->orderByDesc('enrollment_number')->value('enrollment_number');
        }

        if (is_string($last) && preg_match('/-(\d+)$/', $last, $m)) {
            return (int) $m[1];
        }

        return 0;
    }

    /**
     * @param  array{student: int, enrollment: int}  $state
     */
    private function nextCode(string $kind, array &$state): string
    {
        $year = (int) date('Y');
        $state[$kind]++;
        $prefix = $kind === 'student' ? 'EPB-'.$year.'-' : 'INS-'.$year.'-';

        return $prefix.str_pad((string) $state[$kind], 4, '0', STR_PAD_LEFT);
    }
}
