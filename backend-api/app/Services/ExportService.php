<?php

namespace App\Services;

use App\Support\ReportCardTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Generic tabular export service (Excel .xlsx via PhpSpreadsheet, PDF via DOMPDF).
 *
 * Callers pass already-resolved flat rows (associative arrays keyed by column
 * `key`) plus column definitions, a title and a format. This keeps the service
 * decoupled from any specific model.
 *
 * Column definition shape:
 *   ['key' => 'amount', 'label' => 'Montant', 'type' => 'currency', 'width' => 18]
 * Supported types: string (default), number, currency, date, datetime.
 */
class ExportService
{
    private const HEADER_BG = '2563EB';

    /**
     * Build a streamed download response for the given data.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, array{key: string, label: string, type?: string, width?: int}>  $columns
     */
    public function download(array $rows, array $columns, string $title, string $format, string $filename): Response
    {
        return $format === 'pdf'
            ? $this->toPdf($rows, $columns, $title, $filename)
            : $this->toXlsx($rows, $columns, $title, $filename);
    }

    // ── Excel ────────────────────────────────────────────────────────────────

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, array{key: string, label: string, type?: string, width?: int}>  $columns
     */
    private function toXlsx(array $rows, array $columns, string $title, string $filename): StreamedResponse
    {
        $school = $this->schoolInfo();
        $colCount = count($columns);
        $lastColLetter = Coordinate::stringFromColumnIndex(max(1, $colCount));

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(mb_substr($this->sanitizeSheetTitle($title), 0, 31));

        // Row 1: school name. Row 2: title + export date. (Above the data.)
        $sheet->setCellValue('A1', $school['name']);
        $sheet->mergeCells("A1:{$lastColLetter}1");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $sheet->setCellValue('A2', $title.' — '.Carbon::now()->format('d/m/Y'));
        $sheet->mergeCells("A2:{$lastColLetter}2");
        $sheet->getStyle('A2')->getFont()->setSize(11)->setItalic(true);

        // Header row (row 3): bold, blue background, white text.
        $headerRow = 3;
        foreach ($columns as $i => $col) {
            $letter = Coordinate::stringFromColumnIndex($i + 1);
            $sheet->setCellValueExplicit("{$letter}{$headerRow}", $col['label'], DataType::TYPE_STRING);
        }
        $headerStyle = $sheet->getStyle("A{$headerRow}:{$lastColLetter}{$headerRow}");
        $headerStyle->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
        $headerStyle->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FF'.self::HEADER_BG);
        $headerStyle->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

        // Data rows.
        $r = $headerRow + 1;
        foreach ($rows as $row) {
            foreach ($columns as $i => $col) {
                $letter = Coordinate::stringFromColumnIndex($i + 1);
                $this->writeXlsxCell($sheet, "{$letter}{$r}", $row[$col['key']] ?? null, $col['type'] ?? 'string');
            }
            $r++;
        }

        // Auto-size every column.
        for ($i = 1; $i <= $colCount; $i++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i))->setAutoSize(true);
        }
        $sheet->freezePane("A".($headerRow + 1));

        $writer = new Xlsx($spreadsheet);

        return new StreamedResponse(function () use ($writer, $spreadsheet) {
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'max-age=0, no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
        ]);
    }

    private function writeXlsxCell($sheet, string $coord, mixed $value, string $type): void
    {
        if ($value === null || $value === '') {
            $sheet->setCellValueExplicit($coord, '', DataType::TYPE_STRING);

            return;
        }

        switch ($type) {
            case 'number':
                $sheet->setCellValue($coord, (float) $value);
                $sheet->getStyle($coord)->getNumberFormat()->setFormatCode('#,##0.##');
                break;
            case 'currency':
                $sheet->setCellValue($coord, (float) $value);
                $sheet->getStyle($coord)->getNumberFormat()->setFormatCode('#,##0');
                break;
            case 'date':
                $sheet->setCellValueExplicit($coord, $this->formatDate($value, false), DataType::TYPE_STRING);
                break;
            case 'datetime':
                $sheet->setCellValueExplicit($coord, $this->formatDate($value, true), DataType::TYPE_STRING);
                break;
            default:
                // Keep codes/phones as text so Excel never reformats them.
                $sheet->setCellValueExplicit($coord, (string) $value, DataType::TYPE_STRING);
        }
    }

    // ── PDF ──────────────────────────────────────────────────────────────────

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, array{key: string, label: string, type?: string, width?: int}>  $columns
     */
    private function toPdf(array $rows, array $columns, string $title, string $filename): Response
    {
        $school = $this->schoolInfo();
        // Landscape for wide tables, portrait for narrow ones.
        $orientation = count($columns) > 5 ? 'landscape' : 'portrait';

        $formatted = [];
        foreach ($rows as $row) {
            $line = [];
            foreach ($columns as $col) {
                $line[] = $this->formatForDisplay($row[$col['key']] ?? null, $col['type'] ?? 'string');
            }
            $formatted[] = $line;
        }

        $html = view('exports.table', [
            'school' => $school,
            'title' => $title,
            'exportDate' => Carbon::now()->format('d/m/Y H:i'),
            'columns' => $columns,
            'rows' => $formatted,
        ])->render();

        $pdf = Pdf::loadHTML($html)->setPaper('a4', $orientation);

        return $pdf->download($filename);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * @return array{name: string, address: string, phone: string, email: string, logo_data: ?string}
     */
    private function schoolInfo(): array
    {
        $tpl = ReportCardTemplate::get();
        $s = is_array($tpl['school'] ?? null) ? $tpl['school'] : [];

        $address = trim(implode(' ', array_filter([
            (string) ($s['address'] ?? ''),
            (string) ($s['city'] ?? ''),
        ])));

        return [
            'name' => (string) ($s['name'] ?? '') !== '' ? (string) $s['name'] : 'École Paul Bert',
            'address' => $address,
            'phone' => (string) ($s['phone'] ?? ''),
            'email' => (string) ($s['email'] ?? ''),
            'logo_data' => $this->logoDataUri($s['logo_path'] ?? null),
        ];
    }

    private function logoDataUri(?string $logoPath): ?string
    {
        if (empty($logoPath)) {
            return null;
        }

        $absolute = storage_path('app/'.ltrim($logoPath, '/'));
        if (! is_file($absolute) || ! is_readable($absolute)) {
            // Fall back to the public disk relative form.
            $relative = str_starts_with($logoPath, 'public/') ? substr($logoPath, 7) : $logoPath;
            if (! Storage::disk('public')->exists($relative)) {
                return null;
            }
            $absolute = Storage::disk('public')->path($relative);
            if (! is_file($absolute)) {
                return null;
            }
        }

        $data = @file_get_contents($absolute);
        if ($data === false) {
            return null;
        }

        $mime = match (strtolower(pathinfo($absolute, PATHINFO_EXTENSION))) {
            'png' => 'image/png',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };

        return 'data:'.$mime.';base64,'.base64_encode($data);
    }

    private function formatForDisplay(mixed $value, string $type): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return match ($type) {
            'currency' => number_format((float) $value, 0, ',', ' '),
            'number' => rtrim(rtrim(number_format((float) $value, 2, ',', ' '), '0'), ','),
            'date' => $this->formatDate($value, false),
            'datetime' => $this->formatDate($value, true),
            default => (string) $value,
        };
    }

    private function formatDate(mixed $value, bool $withTime): string
    {
        if ($value instanceof \DateTimeInterface) {
            $c = Carbon::instance($value);
        } else {
            try {
                $c = Carbon::parse((string) $value);
            } catch (\Throwable) {
                return (string) $value;
            }
        }

        return $c->format($withTime ? 'd/m/Y H:i' : 'd/m/Y');
    }

    private function sanitizeSheetTitle(string $title): string
    {
        return preg_replace('/[\\\\\/\?\*\[\]:]/', ' ', $title) ?: 'Export';
    }
}
