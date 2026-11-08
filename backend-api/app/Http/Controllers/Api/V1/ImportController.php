<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Imports\ImportFileRequest;
use App\Http\Responses\ApiResponse;
use App\Services\StudentImportService;
use App\Services\TeacherImportService;
use Illuminate\Http\JsonResponse;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Bulk CSV/Excel import for students and teachers, plus downloadable
 * import templates. File parsing and row-level logic live in the
 * dedicated import services.
 */
class ImportController extends Controller
{
    /**
     * Template header + one example row, per import type.
     *
     * @var array<string, array{headers: list<string>, example: list<string>}>
     */
    private const TEMPLATES = [
        'students' => [
            'headers' => [
                'nom', 'prenom', 'date_naissance', 'sexe', 'classe',
                'responsable_nom', 'responsable_prenom', 'responsable_telephone', 'responsable_email',
            ],
            'example' => [
                'Diallo', 'Aminata', '2015-09-01', 'F', 'CP1',
                'Diallo', 'Mamadou', '77 123 45 67', 'mamadou.diallo@example.com',
            ],
        ],
        'teachers' => [
            'headers' => ['nom', 'prenom', 'email', 'telephone', 'specialite'],
            'example' => ['Traoré', 'Moussa', 'moussa.traore@example.com', '70 987 65 43', 'Mathématiques'],
        ],
    ];

    public function students(ImportFileRequest $request, StudentImportService $service): JsonResponse
    {
        $file = $request->file('file');

        try {
            $result = $service->import($file);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), [], 422);
        }

        return ApiResponse::success($result, 'Import des élèves terminé.');
    }

    public function teachers(ImportFileRequest $request, TeacherImportService $service): JsonResponse
    {
        $file = $request->file('file');

        try {
            $result = $service->import($file);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), [], 422);
        }

        return ApiResponse::success($result, 'Import des enseignants terminé.');
    }

    /**
     * Downloadable Excel template (headers + one example row).
     */
    public function template(string $type): StreamedResponse|JsonResponse
    {
        if (! isset(self::TEMPLATES[$type])) {
            return ApiResponse::error('Type de modèle inconnu (students ou teachers).', [], 404);
        }

        $tpl = self::TEMPLATES[$type];
        $lastCol = Coordinate::stringFromColumnIndex(count($tpl['headers']));

        return response()->streamDownload(function () use ($tpl, $type, $lastCol): void {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle(ucfirst($type));

            $sheet->fromArray($tpl['headers'], null, 'A1');
            $sheet->fromArray($tpl['example'], null, 'A2');

            foreach ($tpl['headers'] as $i => $_) {
                $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i + 1))->setAutoSize(true);
            }

            $headerStyle = $sheet->getStyle('A1:'.$lastCol.'1');
            $headerStyle->getFont()->setBold(true);
            $headerStyle->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $headerStyle->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E8EEF7');

            (new XlsxWriter($spreadsheet))->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, "modele_import_{$type}.xlsx", [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
