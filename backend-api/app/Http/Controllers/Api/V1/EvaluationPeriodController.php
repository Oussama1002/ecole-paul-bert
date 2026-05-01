<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\EvaluationPeriods\IndexEvaluationPeriodRequest;
use App\Http\Requests\Api\V1\EvaluationPeriods\StoreEvaluationPeriodRequest;
use App\Http\Requests\Api\V1\EvaluationPeriods\UpdateEvaluationPeriodRequest;
use App\Http\Resources\EvaluationPeriodResource;
use App\Http\Responses\ApiResponse;
use App\Models\EvaluationPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\AuditLogger;

class EvaluationPeriodController extends Controller
{
    public function __construct(
        private AuditLogger $audit
    ) {}

    public function index(IndexEvaluationPeriodRequest $request): JsonResponse
    {
        $query = EvaluationPeriod::query()->with(['schoolYear', 'term']);

        if ($sy = $request->validated('school_year_id')) {
            $query->where('school_year_id', $sy);
        }
        if ($tid = $request->validated('term_id')) {
            $query->where('term_id', $tid);
        }
        $validated = $request->validated();
        if (array_key_exists('is_closed', $validated)) {
            $query->where('is_closed', (bool) $validated['is_closed']);
        }

        $query->orderBy($request->validated('sort_by'), $request->validated('sort_order'));

        $paginator = $query->paginate((int) $request->validated('per_page'))->withQueryString();

        return ApiResponse::success([
            'items' => EvaluationPeriodResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Périodes d’évaluation.');
    }

    public function show(EvaluationPeriod $evaluationPeriod): JsonResponse
    {
        $evaluationPeriod->load(['schoolYear', 'term']);

        return ApiResponse::success(
            (new EvaluationPeriodResource($evaluationPeriod))->resolve(),
            'Période d’évaluation.'
        );
    }

    public function store(StoreEvaluationPeriodRequest $request): JsonResponse
    {
        $period = EvaluationPeriod::query()->create($request->validated());
        $period->load(['schoolYear', 'term']);
        $this->audit->log(
            $request->user(),
            'evaluation_period.created',
            $period,
            null,
            $period->only(['name', 'school_year_id', 'term_id', 'start_date', 'end_date', 'is_closed'])
        );

        return ApiResponse::success(
            (new EvaluationPeriodResource($period))->resolve(),
            'Période d’évaluation créée.',
            201
        );
    }

    public function update(UpdateEvaluationPeriodRequest $request, EvaluationPeriod $evaluationPeriod): JsonResponse
    {
        $before = $evaluationPeriod->only(['name', 'start_date', 'end_date', 'is_closed']);
        $evaluationPeriod->fill($request->validated());
        $evaluationPeriod->save();
        $evaluationPeriod->load(['schoolYear', 'term']);
        $changes = $evaluationPeriod->getChanges();
        if ($changes !== []) {
            $this->audit->log(
                $request->user(),
                'evaluation_period.updated',
                $evaluationPeriod,
                array_intersect_key($before, array_flip(array_keys($changes))),
                $changes
            );
            if (array_key_exists('is_closed', $changes)) {
                $this->audit->log(
                    $request->user(),
                    'grades.locked_period_changed',
                    $evaluationPeriod,
                    ['is_closed' => $before['is_closed'] ?? null],
                    ['is_closed' => $changes['is_closed']]
                );
            }
        }

        return ApiResponse::success(
            (new EvaluationPeriodResource($evaluationPeriod->fresh()))->resolve(),
            'Période d’évaluation mise à jour.'
        );
    }

    public function destroy(Request $request, EvaluationPeriod $evaluationPeriod): JsonResponse
    {
        $before = $evaluationPeriod->only(['name', 'school_year_id', 'term_id', 'is_closed']);
        $evaluationPeriod->delete();
        $this->audit->log(
            $request->user(),
            'evaluation_period.deleted',
            $evaluationPeriod,
            $before,
            ['deleted' => true]
        );

        return ApiResponse::success(null, 'Période d’évaluation supprimée.');
    }
}
