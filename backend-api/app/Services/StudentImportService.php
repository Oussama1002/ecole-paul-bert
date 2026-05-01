<?php

namespace App\Services;

use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Exception as SpreadsheetReaderException;

final class StudentImportService
{
    /**
     * @return array{created: int, skipped: int, errors: list<array{row: int, messages: array<int, string>}>}
     */
    public function importFromFile(UploadedFile $file, ?array $columnMap = null): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $rows = match ($extension) {
            'csv' => $this->readCsv($file->getRealPath()),
            'xlsx', 'xls' => $this->readExcel($file->getRealPath()),
            default => throw new \InvalidArgumentException('Format non supporté (CSV, XLSX, XLS).'),
        };

        if ($rows === []) {
            return ['created' => 0, 'skipped' => 0, 'errors' => [['row' => 0, 'messages' => ['Fichier vide.']]]];
        }

        $header = array_shift($rows);
        $map = $columnMap ?? $this->guessMap($header);

        $created = 0;
        $skipped = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $lineNumber = $index + 2;
            $data = $this->applyMap($row, $header, $map);
            if ($this->rowEmpty($data)) {
                $skipped++;

                continue;
            }

            $v = Validator::make($data, [
                'student_code' => ['required', 'string', 'max:50'],
                'first_name' => ['required', 'string', 'max:100'],
                'last_name' => ['required', 'string', 'max:100'],
                'date_of_birth' => ['required', 'date'],
                'gender' => ['nullable', 'in:male,female,other'],
                'status' => ['nullable', 'in:pending,active,transferred,graduated,suspended,withdrawn'],
            ]);

            if ($v->fails()) {
                $errors[] = ['row' => $lineNumber, 'messages' => array_values($v->errors()->all())];

                continue;
            }

            $clean = $v->validated();
            $clean['gender'] = $clean['gender'] ?? null;
            $clean['status'] = $clean['status'] ?? 'pending';

            try {
                DB::transaction(function () use ($clean) {
                    Student::query()->create([
                        'student_code' => $clean['student_code'],
                        'first_name' => $clean['first_name'],
                        'last_name' => $clean['last_name'],
                        'gender' => $clean['gender'] ?? null,
                        'date_of_birth' => $clean['date_of_birth'],
                        'status' => $clean['status'],
                    ]);
                });
                $created++;
            } catch (\Throwable $e) {
                $errors[] = [
                    'row' => $lineNumber,
                    'messages' => [$e->getMessage()],
                ];
            }
        }

        return ['created' => $created, 'skipped' => $skipped, 'errors' => $errors];
    }

    /**
     * @return list<list<string|null>>
     */
    private function readCsv(string $path): array
    {
        $content = file_get_contents($path);
        if ($content === false) {
            return [];
        }
        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        }
        $lines = preg_split('/\r\n|\r|\n/', $content) ?: [];
        $rows = [];
        foreach ($lines as $line) {
            if ($line === '') {
                continue;
            }
            $rows[] = str_getcsv($line, ';', '"', '\\');
        }

        return $rows;
    }

    /**
     * @return list<list<string|null>>
     */
    private function readExcel(string $path): array
    {
        try {
            $spreadsheet = IOFactory::load($path);
        } catch (SpreadsheetReaderException) {
            return [];
        }
        $sheet = $spreadsheet->getActiveSheet();
        $rows = [];
        foreach ($sheet->getRowIterator() as $row) {
            $cells = [];
            foreach ($row->getCellIterator() as $cell) {
                $cells[] = $cell->getValue() !== null ? (string) $cell->getValue() : null;
            }
            $rows[] = $cells;
        }

        return $rows;
    }

    /**
     * @param  list<string|null>  $header
     * @return array<string, int>
     */
    private function guessMap(array $header): array
    {
        $norm = [];
        foreach ($header as $i => $h) {
            $key = strtolower(trim((string) $h));
            $key = str_replace([' ', '-'], '_', $key);
            $norm[$key] = $i;
        }
        $aliases = [
            'student_code' => ['code', 'code_eleve', 'matricule'],
            'first_name' => ['prenom', 'firstname', 'prénom'],
            'last_name' => ['nom', 'lastname', 'nom_de_famille'],
            'date_of_birth' => ['date_naissance', 'dob', 'naissance'],
            'gender' => ['sexe', 'genre'],
            'status' => ['statut'],
        ];
        $map = [];
        foreach ($aliases as $field => $keys) {
            foreach ($keys as $k) {
                if (isset($norm[$k])) {
                    $map[$field] = $norm[$k];

                    break;
                }
            }
        }
        foreach (['student_code', 'first_name', 'last_name', 'date_of_birth'] as $req) {
            if (! isset($map[$req]) && isset($norm[$req])) {
                $map[$req] = $norm[$req];
            }
        }

        return $map;
    }

    /**
     * @param  list<string|null>  $row
     * @param  list<string|null>  $header
     * @param  array<string, int>  $map
     * @return array<string, mixed>
     */
    private function applyMap(array $row, array $header, array $map): array
    {
        $out = [];
        foreach ($map as $field => $index) {
            $out[$field] = $row[$index] ?? null;
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function rowEmpty(array $data): bool
    {
        foreach (['student_code', 'first_name', 'last_name'] as $k) {
            if (! empty(trim((string) ($data[$k] ?? '')))) {
                return false;
            }
        }

        return true;
    }
}
