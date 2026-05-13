<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ReportCards\GenerateReportCardRequest;
use App\Http\Requests\Api\V1\ReportCards\IndexReportCardRequest;
use App\Http\Responses\ApiResponse;
use App\Models\ReportCard;
use App\Services\ReportCardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ReportCardController extends Controller
{
    public function __construct(
        private ReportCardService $svc
    ) {}

    public function index(IndexReportCardRequest $request): JsonResponse
    {
        $q = ReportCard::query()
            ->with([
                'student:id,first_name,last_name,student_code',
                'schoolClass:id,name',
                'evaluationPeriod:id,name',
                'schoolYear:id,name',
            ])
            ->orderByDesc('updated_at');
        foreach (['school_year_id', 'evaluation_period_id', 'class_id', 'student_id'] as $k) {
            if ($request->filled($k)) {
                $q->where($k, (int) $request->input($k));
            }
        }
        if ($request->filled('status')) {
            $q->where('status', (string) $request->input('status'));
        }

        $p = $q->paginate(min((int) $request->input('per_page', 30), 100))->withQueryString();

        return ApiResponse::success([
            'items' => $p->getCollection()->map(fn (ReportCard $rc) => $this->toDto($rc)),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Bulletins.');
    }

    public function show(ReportCard $reportCard): JsonResponse
    {
        $reportCard->loadMissing([
            'student:id,first_name,last_name,student_code',
            'schoolClass:id,name',
            'evaluationPeriod:id,name',
            'schoolYear:id,name',
        ]);

        return ApiResponse::success($this->toDto($reportCard), 'Bulletin.');
    }

    public function generate(GenerateReportCardRequest $request): JsonResponse
    {
        $items = $this->svc->generateForClassPeriod(
            (int) $request->input('school_year_id'),
            (int) $request->input('class_id'),
            (int) $request->input('evaluation_period_id'),
            $request->user()?->id
        );

        return ApiResponse::success([
            'items' => array_map(fn (ReportCard $rc) => $this->toDto($rc), $items),
        ], 'Bulletins générés.');
    }

    public function publish(Request $request, ReportCard $reportCard): JsonResponse
    {
        $this->svc->publish($reportCard, $request->user()?->id);

        return ApiResponse::success($this->toDto($reportCard->fresh()), 'Bulletin publié.');
    }

    public function archive(Request $request, ReportCard $reportCard): JsonResponse
    {
        $this->svc->archive($reportCard, $request->user()?->id);

        return ApiResponse::success($this->toDto($reportCard->fresh()), 'Bulletin archivé.');
    }

    public function download(Request $request, ReportCard $reportCard)
    {
        if (! $reportCard->pdf_path || ! Storage::disk('local')->exists($reportCard->pdf_path)) {
            try {
                $this->svc->generatePdf($reportCard);
                $reportCard = $reportCard->fresh();
            } catch (\Throwable $e) {
                return ApiResponse::error('Impossible de générer le PDF : '.$e->getMessage(), [], 500);
            }
        }

        if (! $reportCard->pdf_path || ! Storage::disk('local')->exists($reportCard->pdf_path)) {
            return ApiResponse::error('Fichier PDF introuvable après génération.', [], 404);
        }

        $name = "bulletin_{$reportCard->student_id}_{$reportCard->evaluation_period_id}.pdf";

        return Storage::disk('local')->response($reportCard->pdf_path, $name, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$name.'"',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function toDto(ReportCard $rc): array
    {
        $studentName = $rc->student
            ? trim(($rc->student->last_name ?? '').' '.($rc->student->first_name ?? ''))
            : '';

        return [
            'id' => $rc->id,
            'school_year_id' => (int) $rc->school_year_id,
            'term_id' => $rc->term_id ? (int) $rc->term_id : null,
            'evaluation_period_id' => (int) $rc->evaluation_period_id,
            'class_id' => (int) $rc->class_id,
            'student_id' => (int) $rc->student_id,
            'student_name' => $studentName !== '' ? $studentName : null,
            'student_code' => $rc->student?->student_code ?: null,
            'class_name' => $rc->schoolClass?->name ?: null,
            'evaluation_period_name' => $rc->evaluationPeriod?->name ?: null,
            'school_year_name' => $rc->schoolYear?->name ?: null,
            'subject_averages' => $rc->subject_averages ?? [],
            'period_average' => $rc->period_average !== null ? (string) $rc->period_average : null,
            'rank' => $rc->rank,
            'rank_out_of' => $rc->rank_out_of,
            'absent_count' => (int) $rc->absent_count,
            'late_count' => (int) $rc->late_count,
            'status' => $rc->status,
            'generated_at' => $rc->generated_at?->toIso8601String(),
            'published_at' => $rc->published_at?->toIso8601String(),
            'archived_at' => $rc->archived_at?->toIso8601String(),
            'has_pdf' => (bool) $rc->pdf_path,
            'created_at' => $rc->created_at?->toIso8601String(),
            'updated_at' => $rc->updated_at?->toIso8601String(),
        ];
    }
}

