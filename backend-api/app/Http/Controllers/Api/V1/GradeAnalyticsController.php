<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Enrollment;
use App\Models\Student;
use App\Services\GradeCalculationService;
use App\Services\RankingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GradeAnalyticsController extends Controller
{
    public function __construct(
        private GradeCalculationService $calc,
        private RankingService $ranking
    ) {}

    public function classRanking(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['required', 'integer', 'exists:school_years,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'evaluation_period_id' => ['required', 'integer', 'exists:evaluation_periods,id'],
        ]);

        $schoolYearId = (int) $request->input('school_year_id');
        $classId = (int) $request->input('class_id');
        $periodId = (int) $request->input('evaluation_period_id');

        $calc = $this->calc->calculateForClassPeriod($schoolYearId, $classId, $periodId);

        $activeStudentIds = Enrollment::query()
            ->where('school_year_id', $schoolYearId)
            ->where('class_id', $classId)
            ->whereIn('academic_status', ['enrolled', 're_enrolled', 'transferred_in'])
            ->pluck('student_id')
            ->values()
            ->map(fn ($v) => (int) $v)
            ->all();

        $students = Student::query()
            ->whereIn('id', $activeStudentIds)
            ->get(['id', 'first_name', 'last_name', 'student_code'])
            ->keyBy('id');

        $strategy = (string) (config('grades.ranking.strategy') ?? 'competition');
        $rankMap = $this->ranking->rank(
            array_map(
                fn (int $sid) => [
                    'id' => $sid,
                    'value' => $calc['by_student'][$sid]['period_average'] ?? null,
                ],
                $activeStudentIds
            ),
            $strategy
        );

        $items = [];
        foreach ($activeStudentIds as $sid) {
            $st = $students->get($sid);
            $row = $calc['by_student'][$sid] ?? null;
            $items[] = [
                'student' => $st ? [
                    'id' => $st->id,
                    'student_code' => $st->student_code,
                    'first_name' => $st->first_name,
                    'last_name' => $st->last_name,
                ] : ['id' => $sid],
                'period_average' => $row['period_average'] ?? null,
                'rank' => $rankMap[$sid] ?? null,
                'subject_averages' => $row['subject_averages'] ?? [],
            ];
        }

        // sort by rank then name
        usort($items, static function (array $a, array $b): int {
            $ra = $a['rank'];
            $rb = $b['rank'];
            if ($ra === null && $rb === null) {
                return 0;
            }
            if ($ra === null) {
                return 1;
            }
            if ($rb === null) {
                return -1;
            }
            if ($ra !== $rb) {
                return $ra < $rb ? -1 : 1;
            }
            $la = (string) ($a['student']['last_name'] ?? '');
            $lb = (string) ($b['student']['last_name'] ?? '');

            return strcmp($la, $lb);
        });

        return ApiResponse::success([
            'ranking_strategy' => $strategy,
            'subject_ids' => $calc['subject_ids'],
            'items' => $items,
        ], 'Classement.');
    }

    public function recalculateWeightedScores(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['required', 'integer', 'exists:school_years,id'],
            'evaluation_period_id' => ['required', 'integer', 'exists:evaluation_periods,id'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
        ]);

        $sy = (int) $request->input('school_year_id');
        $period = (int) $request->input('evaluation_period_id');
        $classId = $request->filled('class_id') ? (int) $request->input('class_id') : null;

        $q = \App\Models\Grade::query()
            ->where('school_year_id', $sy)
            ->where('evaluation_period_id', $period);

        if ($classId) {
            $q->where('class_id', $classId);
        }

        $count = 0;
        foreach ($q->cursor() as $g) {
            $coef = (float) ($g->coefficient ?? 1);
            $g->weighted_score = $this->calc->weightedScore((float) $g->score, (float) $g->max_score, $coef);
            $g->save();
            $count++;
        }

        return ApiResponse::success(['updated' => $count], 'Recalcul terminé.');
    }
}

