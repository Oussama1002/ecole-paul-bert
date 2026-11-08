<?php

namespace App\Services;

use App\Models\Role;
use App\Models\Teacher;
use App\Models\User;
use App\Support\Import\SpreadsheetReader;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Bulk teacher import from CSV / XLSX / XLS.
 *
 * Expected columns (header names, accents/case-insensitive):
 *   nom*, prenom*, email* (unique), telephone, specialite.
 *
 * For each valid row a login User (role = teacher) is created with a freshly
 * generated password, then a Teacher record linked to that user. The plaintext
 * passwords are returned in `credentials` so an admin can hand them out — they
 * are never retrievable again afterwards.
 *
 * @phpstan-type ImportError array{row: int, field: string, message: string}
 * @phpstan-type Credential array{name: string, email: string, password: string}
 */
class TeacherImportService
{
    public function __construct(private readonly SpreadsheetReader $reader) {}

    /**
     * @return array{inserted: int, skipped: int, errors: list<ImportError>, credentials: list<Credential>}
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
                'credentials' => [],
            ];
        }

        $roleId = Role::query()->where('code', 'teacher')->value('id');
        if ($roleId === null) {
            return [
                'inserted' => 0,
                'skipped' => 0,
                'errors' => [['row' => 0, 'field' => 'global', 'message' => 'Rôle « enseignant » introuvable.']],
                'credentials' => [],
            ];
        }

        /** @var list<ImportError> $errors */
        $errors = [];
        /** @var list<Credential> $credentials */
        $credentials = [];
        $inserted = 0;
        $skipped = 0;
        $seenEmails = [];
        $codeSeq = $this->initialEmployeeSequence();
        $roleIdInt = (int) $roleId;

        try {
            DB::transaction(function () use ($rows, $roleIdInt, &$errors, &$credentials, &$inserted, &$skipped, &$seenEmails, &$codeSeq): void {
                foreach ($rows as $row) {
                    $line = $row['line'];
                    $v = $row['values'];

                    if ($this->rowIsEmpty($v)) {
                        $skipped++;

                        continue;
                    }

                    $rowErrors = $this->validateRow($v, $line, $seenEmails);
                    if ($rowErrors !== []) {
                        foreach ($rowErrors as $e) {
                            $errors[] = $e;
                        }
                        $skipped++;

                        continue;
                    }

                    $email = mb_strtolower(trim($v['email']));
                    $seenEmails[$email] = true;

                    $credentials[] = $this->createTeacher($v, $email, $roleIdInt, $codeSeq);
                    $inserted++;
                }
            });
        } catch (\Throwable $e) {
            return [
                'inserted' => 0,
                'skipped' => 0,
                'errors' => [[
                    'row' => 0,
                    'field' => 'global',
                    'message' => 'Import annulé suite à une erreur critique : '.$e->getMessage(),
                ]],
                'credentials' => [],
            ];
        }

        return [
            'inserted' => $inserted,
            'skipped' => $skipped,
            'errors' => $errors,
            'credentials' => $credentials,
        ];
    }

    /**
     * @param  array<string, string>  $v
     * @param  array<string, bool>  $seenEmails
     * @return list<array{row: int, field: string, message: string}>
     */
    private function validateRow(array $v, int $line, array $seenEmails): array
    {
        $errors = [];

        if (($v['nom'] ?? '') === '') {
            $errors[] = ['row' => $line, 'field' => 'nom', 'message' => 'Le nom est obligatoire.'];
        }
        if (($v['prenom'] ?? '') === '') {
            $errors[] = ['row' => $line, 'field' => 'prenom', 'message' => 'Le prénom est obligatoire.'];
        }

        $email = mb_strtolower(trim($v['email'] ?? ''));
        if ($email === '') {
            $errors[] = ['row' => $line, 'field' => 'email', 'message' => 'L’email est obligatoire.'];
        } elseif (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = ['row' => $line, 'field' => 'email', 'message' => 'Email invalide.'];
        } elseif (isset($seenEmails[$email])) {
            $errors[] = ['row' => $line, 'field' => 'email', 'message' => 'Email en double dans le fichier.'];
        } elseif ($this->emailTaken($email)) {
            $errors[] = ['row' => $line, 'field' => 'email', 'message' => 'Cet email est déjà utilisé.'];
        }

        return $errors;
    }

    /**
     * @param  array<string, string>  $v
     * @return array{name: string, email: string, password: string}
     */
    private function createTeacher(array $v, string $email, int $roleId, int &$codeSeq): array
    {
        $password = $this->generatePassword();

        $user = User::query()->create([
            'role_id' => $roleId,
            'first_name' => $v['prenom'],
            'last_name' => $v['nom'],
            'email' => $email,
            'phone' => ($v['telephone'] ?? '') !== '' ? $v['telephone'] : null,
            'username' => $this->generateUsername($email),
            'password_hash' => Hash::make($password),
            'status' => 'active',
        ]);

        $user->clearPermissionCache();

        Teacher::query()->create([
            'user_id' => $user->id,
            'employee_code' => $this->nextEmployeeCode($codeSeq),
            'first_name' => $v['prenom'],
            'last_name' => $v['nom'],
            'email' => $email,
            'phone' => ($v['telephone'] ?? '') !== '' ? $v['telephone'] : null,
            'specialization' => ($v['specialite'] ?? '') !== '' ? $v['specialite'] : null,
            'employment_type' => 'full_time',
            'hire_date' => now()->toDateString(),
            'status' => 'active',
        ]);

        return [
            'name' => trim($v['nom'].' '.$v['prenom']),
            'email' => $email,
            'password' => $password,
        ];
    }

    private function emailTaken(string $email): bool
    {
        return User::query()->whereRaw('LOWER(email) = ?', [$email])->exists()
            || Teacher::query()->whereRaw('LOWER(email) = ?', [$email])->exists();
    }

    private function generateUsername(string $email): string
    {
        $base = Str::lower(Str::slug(Str::before($email, '@'), ''));
        $base = $base !== '' ? $base : 'enseignant';

        $username = $base;
        $n = 1;
        while (User::query()->where('username', $username)->exists()) {
            $n++;
            $username = $base.$n;
        }

        return $username;
    }

    private function generatePassword(): string
    {
        // Letters + digits only (no symbols) so it is easy to read out / type.
        return Str::password(12, true, true, false, false);
    }

    private function initialEmployeeSequence(): int
    {
        $prefix = 'ENS-'.date('Y').'-';
        $last = Teacher::query()->where('employee_code', 'like', $prefix.'%')
            ->orderByDesc('employee_code')->value('employee_code');

        if (is_string($last) && preg_match('/-(\d+)$/', $last, $m)) {
            return (int) $m[1];
        }

        return 0;
    }

    private function nextEmployeeCode(int &$seq): string
    {
        $prefix = 'ENS-'.date('Y').'-';
        do {
            $seq++;
            $code = $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
        } while (Teacher::query()->where('employee_code', $code)->exists());

        return $code;
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
}
