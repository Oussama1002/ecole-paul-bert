<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Grades\BulkStoreGradesRequest;
use App\Http\Requests\Api\V1\Grades\StoreGradeRequest;
use App\Http\Requests\Api\V1\Grades\UpdateGradeRequest;
use App\Http\Responses\ApiResponse;
use App\Models\EvaluationPeriod;
use App\Models\Grade;
use App\Services\AuditLogger;
use App\Services\GradeValidationService;
use App\Services\TeacherScopeService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GradeController extends Controller
{
    public function __construct(
        private GradeValidationService $validationService,
        private TeacherScopeService $teacherScope,
        private AuditLogger $auditLogger
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'evaluation_period_id' => ['nullable', 'integer', 'exists:evaluation_periods,id'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'student_id' => ['nullable', 'integer', 'exists:students,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'is_validated' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = Grade::query();
        foreach (['school_year_id', 'evaluation_period_id', 'class_id', 'student_id', 'subject_id'] as $k) {
            if ($request->filled($k)) {
                $q->where($k, (int) $request->input($k));
            }
        }
        if ($request->has('is_validated')) {
            $q->where('is_validated', (bool) $request->boolean('is_validated'));
        }

        $this->teacherScope->restrictGradesQuery($request->user(), $q);

        $p = $q->orderByDesc('created_at')->paginate(min((int) $request->input('per_page', 30), 100));

        return ApiResponse::success([
            'items' => $p->getCollection()->map(fn (Grade $g) => $this->toDto($g)),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Notes.');
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'evaluation_period_id' => ['nullable', 'integer', 'exists:evaluation_periods,id'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'student_id' => ['nullable', 'integer', 'exists:students,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'is_validated' => ['nullable', 'boolean'],
        ]);

        $q = Grade::query()->with(['student:id,first_name,last_name,student_code', 'subject:id,name']);
        foreach (['school_year_id', 'evaluation_period_id', 'class_id', 'student_id', 'subject_id'] as $k) {
            if ($request->filled($k)) {
                $q->where($k, (int) $request->input($k));
            }
        }
        if ($request->has('is_validated')) {
            $q->where('is_validated', (bool) $request->boolean('is_validated'));
        }

        $this->teacherScope->restrictGradesQuery($request->user(), $q);

        $items = $q->orderByDesc('created_at')->limit(8000)->get();

        $filename = 'notes_'.date('Y-m-d_His').'.xlsx';

        return response()->streamDownload(function () use ($items) {
            $sheet = new Spreadsheet();
            $ws = $sheet->getActiveSheet();
            $ws->fromArray([
                'id', 'eleve_code', 'eleve', 'matiere', 'classe_id', 'periode_id', 'note', 'max', 'coef', 'ponderee', 'validee',
            ], null, 'A1');
            $row = 2;
            foreach ($items as $g) {
                $stu = $g->student;
                $sub = $g->subject;
                $ws->fromArray([
                    $g->id,
                    $stu?->student_code,
                    trim(($stu?->last_name ?? '').' '.($stu?->first_name ?? '')),
                    $sub?->name,
                    $g->class_id,
                    $g->evaluation_period_id,
                    (string) $g->score,
                    (string) $g->max_score,
                    (string) $g->coefficient,
                    $g->weighted_score !== null ? (string) $g->weighted_score : '',
                    $g->is_validated ? 'oui' : 'non',
                ], null, 'A'.$row);
                $row++;
            }
            (new Xlsx($sheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function show(Request $request, Grade $grade): JsonResponse
    {
        $this->teacherScope->assertGradeRowScope($request->user(), $grade);

        return ApiResponse::success($this->toDto($grade), 'Note.');
    }

    public function store(StoreGradeRequest $request): JsonResponse
    {
        $data = $request->validated();

        $this->teacherScope->assertTeacherTeachesClassSubject(
            $request->user(),
            (int) $data['school_year_id'],
            (int) $data['class_id'],
            (int) $data['subject_id']
        );

        $this->ensurePeriodNotClosed($data['evaluation_period_id'], $request);

        $data['entered_by'] = $request->user()?->id;
        $data['coefficient'] = $data['coefficient'] ?? 1;
        $this->validationService->validateBusinessRules($data);

        $data['weighted_score'] = $this->weightedScore((float) $data['score'], (float) $data['max_score'], (float) $data['coefficient']);

        try {
            $grade = Grade::query()->create($data);
        } catch (QueryException $e) {
            return ApiResponse::error('Doublon : une note existe déjà pour cet élève/matière/période.', [], 422);
        }

        return ApiResponse::success($this->toDto($grade), 'Note créée.', 201);
    }

    public function update(UpdateGradeRequest $request, Grade $grade): JsonResponse
    {
        $this->teacherScope->assertGradeRowScope($request->user(), $grade);

        $this->ensurePeriodNotClosed($grade->evaluation_period_id, $request);

        $grade->fill($request->validated());

        if ($request->has('is_validated')) {
            $grade->is_validated = (bool) $request->boolean('is_validated');
            $grade->validated_at = $grade->is_validated ? now() : null;
            $grade->validated_by = $grade->is_validated ? $request->user()?->id : null;
        }

        $data = array_merge($grade->getAttributes(), $request->validated());
        $payload = [
            'school_year_id' => $data['school_year_id'],
            'term_id' => $data['term_id'],
            'evaluation_period_id' => $data['evaluation_period_id'],
            'score' => $data['score'],
            'max_score' => $data['max_score'],
        ];
        $this->validationService->validateBusinessRules($payload);

        $coef = (float) ($data['coefficient'] ?? 1);
        $grade->weighted_score = $this->weightedScore((float) $grade->score, (float) $grade->max_score, $coef);

        $grade->save();

        return ApiResponse::success($this->toDto($grade->fresh()), 'Note mise à jour.');
    }

    public function destroy(Request $request, Grade $grade): JsonResponse
    {
        $this->teacherScope->assertGradeRowScope($request->user(), $grade);

        $this->ensurePeriodNotClosed($grade->evaluation_period_id, $request);
        $grade->delete();

        return ApiResponse::success(null, 'Note supprimée.');
    }

    public function bulkStore(BulkStoreGradesRequest $request): JsonResponse
    {
        $payload = $request->validated();

        $this->teacherScope->assertTeacherTeachesClassSubject(
            $request->user(),
            (int) $payload['school_year_id'],
            (int) $payload['class_id'],
            (int) $payload['subject_id']
        );

        $this->ensurePeriodNotClosed($payload['evaluation_period_id'], $request);

        $maxScore = (float) $payload['max_score'];
        $coef = (float) ($payload['coefficient'] ?? 1);
        $enteredBy = $request->user()?->id;

        $teacherIdForRows = $payload['teacher_id'] ?? null;
        if ($this->teacherScope->isStrictTeacher($request->user())) {
            $teacherIdForRows = $this->teacherScope->resolveTeacherId($request->user());
        }

        $saved = [];
        DB::beginTransaction();
        try {
            foreach ($payload['items'] as $row) {
                $data = [
                    'school_year_id' => (int) $payload['school_year_id'],
                    'term_id' => $payload['term_id'] ?? null,
                    'evaluation_period_id' => (int) $payload['evaluation_period_id'],
                    'evaluation_type_id' => null,
                    'class_id' => (int) $payload['class_id'],
                    'student_id' => (int) $row['student_id'],
                    'subject_id' => (int) $payload['subject_id'],
                    'teacher_id' => $teacherIdForRows,
                    'score' => (float) $row['score'],
                    'max_score' => $maxScore,
                    'coefficient' => $coef,
                    'weighted_score' => $this->weightedScore((float) $row['score'], $maxScore, $coef),
                    'appreciation' => $row['appreciation'] ?? null,
                    'entered_by' => $enteredBy,
                ];

                $this->validationService->validateBusinessRules($data);

                /** @var Grade $grade */
                $grade = Grade::query()->updateOrCreate(
                    [
                        'evaluation_period_id' => $data['evaluation_period_id'],
                        'class_id' => $data['class_id'],
                        'student_id' => $data['student_id'],
                        'subject_id' => $data['subject_id'],
                    ],
                    $data
                );

                $saved[] = $grade;
            }
            DB::commit();
        } catch (ValidationException $e) {
            DB::rollBack();

            return ApiResponse::error($e->getMessage(), $e->errors(), 422);
        } catch (\Throwable $e) {
            DB::rollBack();

            return ApiResponse::error('Erreur saisie bulk.', [], 500);
        }

        return ApiResponse::success([
            'items' => array_map(fn (Grade $g) => $this->toDto($g), $saved),
        ], 'Saisie bulk enregistrée.');
    }

    private function ensurePeriodNotClosed(int $evaluationPeriodId, Request $request): void
    {
        $period = EvaluationPeriod::query()->findOrFail($evaluationPeriodId);
        if (! $period->is_closed) {
            return;
        }

        // Override only for users having a dedicated permission.
        if ($request->user()?->hasPermission('grades.override_lock')) {
            $this->auditLogger->log(
                $request->user(),
                'grades.override_closed_period',
                $period,
                null,
                ['evaluation_period_id' => $evaluationPeriodId],
                $request
            );

            return;
        }

        throw ValidationException::withMessages([
            'evaluation_period_id' => ['Période clôturée : modification interdite.'],
        ]);
    }

    private function weightedScore(float $score, float $max, float $coef): float
    {
        if ($max <= 0) {
            return 0.0;
        }

        // Normalize to /20 then apply coefficient
        return round((($score / $max) * 20.0) * $coef, 4);
    }

    /**
     * @return array<string, mixed>
     */
    private function toDto(Grade $g): array
    {
        return [
            'id' => $g->id,
            'school_year_id' => (int) $g->school_year_id,
            'term_id' => $g->term_id ? (int) $g->term_id : null,
            'evaluation_period_id' => (int) $g->evaluation_period_id,
            'class_id' => (int) $g->class_id,
            'student_id' => (int) $g->student_id,
            'subject_id' => (int) $g->subject_id,
            'teacher_id' => $g->teacher_id ? (int) $g->teacher_id : null,
            'score' => (string) $g->score,
            'max_score' => (string) $g->max_score,
            'coefficient' => (string) $g->coefficient,
            'weighted_score' => $g->weighted_score !== null ? (string) $g->weighted_score : null,
            'appreciation' => $g->appreciation,
            'is_validated' => (bool) $g->is_validated,
            'validated_at' => $g->validated_at?->toIso8601String(),
            'validated_by' => $g->validated_by ? (int) $g->validated_by : null,
            'entered_by' => $g->entered_by ? (int) $g->entered_by : null,
            'created_at' => $g->created_at?->toIso8601String(),
            'updated_at' => $g->updated_at?->toIso8601String(),
        ];
    }
}

