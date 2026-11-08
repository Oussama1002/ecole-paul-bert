<?php

namespace App\Support\Import;

use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Exception as SpreadsheetReaderException;

/**
 * Reads an uploaded CSV / XLSX / XLS file into header-keyed rows.
 *
 * Header cells are normalized (lowercased, de-accented, spaces/dashes → "_")
 * so that "Prénom", "prenom" and "PRENOM" all map to the key `prenom`.
 * Each data row keeps its 1-based spreadsheet line number for error reporting.
 */
class SpreadsheetReader
{
    /**
     * @return array{header: list<string>, rows: list<array{line: int, values: array<string, string>}>}
     */
    public function read(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $matrix = match ($extension) {
            'csv', 'txt' => $this->readCsv((string) $file->getRealPath()),
            'xlsx', 'xls' => $this->readSpreadsheet((string) $file->getRealPath()),
            default => throw new \InvalidArgumentException('Format non supporté (CSV, XLSX, XLS).'),
        };

        if ($matrix === []) {
            return ['header' => [], 'rows' => []];
        }

        $rawHeader = array_shift($matrix);
        $header = [];
        foreach ($rawHeader as $cell) {
            $header[] = $this->normalizeKey((string) $cell);
        }

        $rows = [];
        foreach ($matrix as $index => $cells) {
            // +2: one for the stripped header, one for 1-based numbering.
            $line = $index + 2;
            $values = [];
            foreach ($header as $col => $key) {
                if ($key === '') {
                    continue;
                }
                $values[$key] = isset($cells[$col]) ? trim((string) $cells[$col]) : '';
            }
            $rows[] = ['line' => $line, 'values' => $values];
        }

        return ['header' => array_values(array_filter($header)), 'rows' => $rows];
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
        // Strip a UTF-8 BOM if present.
        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        }

        $lines = preg_split('/\r\n|\r|\n/', $content) ?: [];
        $lines = array_values(array_filter($lines, static fn ($l) => $l !== ''));
        if ($lines === []) {
            return [];
        }

        // Sniff the delimiter from the header line: ';' (common in FR exports) or ','.
        $delimiter = substr_count($lines[0], ';') >= substr_count($lines[0], ',') ? ';' : ',';

        $rows = [];
        foreach ($lines as $line) {
            $rows[] = str_getcsv($line, $delimiter, '"', '\\');
        }

        return $rows;
    }

    /**
     * @return list<list<string|null>>
     */
    private function readSpreadsheet(string $path): array
    {
        try {
            $reader = IOFactory::createReaderForFile($path);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($path);
        } catch (SpreadsheetReaderException $e) {
            throw new \InvalidArgumentException('Fichier illisible : '.$e->getMessage());
        }

        $rows = [];
        foreach ($spreadsheet->getActiveSheet()->getRowIterator() as $row) {
            $cells = [];
            $iterator = $row->getCellIterator();
            $iterator->setIterateOnlyExistingCells(false);
            foreach ($iterator as $cell) {
                $value = $cell->getValue();
                $cells[] = $value !== null ? (string) $value : null;
            }
            $rows[] = $cells;
        }

        return $rows;
    }

    private function normalizeKey(string $value): string
    {
        $value = trim(mb_strtolower($value));
        // De-accent (é → e, à → a, …).
        $translit = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if ($translit !== false) {
            $value = $translit;
        }
        $value = preg_replace('/[^a-z0-9]+/', '_', $value) ?? '';

        return trim($value, '_');
    }
}
