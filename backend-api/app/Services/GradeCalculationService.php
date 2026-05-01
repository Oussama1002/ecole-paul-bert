<?php

namespace App\Services;

use App\Models\Grade;
use Illuminate\Support\Collection;

class GradeCalculationService
{
    /**
     * @return array{
     *   by_student: array<int, array{
     *     student_id:int,
     *     subject_averages: array<int, float>,
     *     period_average: float|null,
     *     total_coef: float,
     *     total_weighted: float
     *   }>,
     *   subject_ids: list<int>
     * }
     */
    public function calculateForClassPeriod(int $schoolYearId, int $classId, int $evaluationPeriodId): array
    {
        /** @var Collection<int, Grade> $grades */
        $grades = Grade::query()
            ->where('school_year_id', $schoolYearId)
            ->where('class_id', $classId)
            ->where('evaluation_period_id', $evaluationPeriodId)
            ->get();

        $subjectIds = $grades->pluck('subject_id')->unique()->values()->map(fn ($v) => (int) $v)->all();

        $grouped = $grades->groupBy('student_id');
        $byStudent = [];

        foreach ($grouped as $studentId => $studentGrades) {
            $studentId = (int) $studentId;

            $bySubject = $studentGrades->groupBy('subject_id');
            $subjectAverages = [];

            $totalCoef = 0.0;
            $totalWeighted = 0.0;

            foreach ($bySubject as $subjectId => $subjectGrades) {
                $subjectId = (int) $subjectId;
                $coefSum = 0.0;
                $weightedSum = 0.0;

                foreach ($subjectGrades as $g) {
                    $coef = (float) ($g->coefficient ?? 1);
                    $weighted = $g->weighted_score !== null
                        ? (float) $g->weighted_score
                        : $this->weightedScore((float) $g->score, (float) $g->max_score, $coef);

                    $coefSum += $coef;
                    $weightedSum += $weighted;
                }

                if ($coefSum > 0) {
                    $subjectAverages[$subjectId] = round($weightedSum / $coefSum, 2);
                    $totalCoef += $coefSum;
                    $totalWeighted += $weightedSum;
                }
            }

            $periodAverage = $totalCoef > 0 ? round($totalWeighted / $totalCoef, 2) : null;

            $byStudent[$studentId] = [
                'student_id' => $studentId,
                'subject_averages' => $subjectAverages,
                'period_average' => $periodAverage,
                'total_coef' => round($totalCoef, 4),
                'total_weighted' => round($totalWeighted, 4),
            ];
        }

        return [
            'by_student' => $byStudent,
            'subject_ids' => $subjectIds,
        ];
    }

    public function weightedScore(float $score, float $max, float $coef): float
    {
        if ($max <= 0) {
            return 0.0;
        }

        return round((($score / $max) * 20.0) * $coef, 4);
    }
}

