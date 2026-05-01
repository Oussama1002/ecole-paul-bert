<?php

namespace App\Services;

use App\Models\AttendanceRecord;
use App\Models\Enrollment;
use App\Models\EvaluationPeriod;
use App\Models\ReportCard;
use App\Models\Student;
use App\Models\Subject;
use App\Support\ReportCardTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class ReportCardService
{
    public function __construct(
        private GradeCalculationService $calc,
        private RankingService $ranking
    ) {}

    /**
     * Generate (or regenerate) report cards for a class + period.
     *
     * @return list<ReportCard>
     */
    public function generateForClassPeriod(int $schoolYearId, int $classId, int $evaluationPeriodId, ?int $userId): array
    {
        $period = EvaluationPeriod::query()->findOrFail($evaluationPeriodId);

        $activeStudentIds = Enrollment::query()
            ->where('school_year_id', $schoolYearId)
            ->where('class_id', $classId)
            ->whereIn('academic_status', ['enrolled', 're_enrolled', 'transferred_in'])
            ->pluck('student_id')
            ->values()
            ->map(fn ($v) => (int) $v)
            ->all();

        $calc = $this->calc->calculateForClassPeriod($schoolYearId, $classId, $evaluationPeriodId);

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

        $saved = [];

        foreach ($activeStudentIds as $sid) {
            $row = $calc['by_student'][$sid] ?? null;
            $subjectAverages = $row['subject_averages'] ?? [];
            $periodAverage = $row['period_average'] ?? null;
            $rank = $rankMap[$sid] ?? null;

            [$absentCount, $lateCount] = $this->attendanceCounts($schoolYearId, $sid, $period);

            /** @var ReportCard $rc */
            $rc = ReportCard::query()->updateOrCreate(
                [
                    'evaluation_period_id' => $evaluationPeriodId,
                    'class_id' => $classId,
                    'student_id' => $sid,
                ],
                [
                    'school_year_id' => $schoolYearId,
                    'term_id' => $period->term_id,
                    'subject_averages' => $subjectAverages,
                    'period_average' => $periodAverage,
                    'rank' => $rank,
                    'rank_out_of' => count($activeStudentIds),
                    'absent_count' => $absentCount,
                    'late_count' => $lateCount,
                    'status' => 'draft',
                    'generated_at' => now(),
                    'generated_by' => $userId,
                ]
            );

            $this->generatePdf($rc);

            $saved[] = $rc->fresh();
        }

        return $saved;
    }

    public function publish(ReportCard $rc, ?int $userId): void
    {
        $rc->status = 'published';
        $rc->published_at = now();
        $rc->published_by = $userId;
        $rc->save();
    }

    public function archive(ReportCard $rc, ?int $userId): void
    {
        $rc->status = 'archived';
        $rc->archived_at = now();
        $rc->archived_by = $userId;
        $rc->save();
    }

    public function generatePdf(ReportCard $rc): void
    {
        $rc->loadMissing(['student', 'schoolClass', 'evaluationPeriod']);

        $student = $rc->student;
        $class = $rc->schoolClass;
        $period = $rc->evaluationPeriod;

        // Resolve subject ids → names once, so the PDF can display human labels
        // instead of raw #IDs. Falls back to "#<id>" if a subject is missing.
        $subjectIds = array_keys($rc->subject_averages ?? []);
        $subjectNames = [];
        if (! empty($subjectIds)) {
            $subjectNames = Subject::query()
                ->whereIn('id', $subjectIds)
                ->pluck('name', 'id')
                ->all();
        }

        $template = ReportCardTemplate::get();

        $html = view('report-cards.pdf', [
            'reportCard' => $rc,
            'student' => $student,
            'class' => $class,
            'period' => $period,
            'template' => $template,
            'subjectNames' => $subjectNames,
        ])->render();

        $pdf = Pdf::loadHTML($html)->setPaper('a4');

        $fileName = "bulletin_{$rc->school_year_id}_{$rc->evaluation_period_id}_{$rc->class_id}_{$rc->student_id}.pdf";
        $path = "report-cards/{$fileName}";

        Storage::disk('local')->put($path, $pdf->output());

        $rc->pdf_path = $path;
        $rc->save();
    }

    /**
     * @return array{0:int,1:int}
     */
    private function attendanceCounts(int $schoolYearId, int $studentId, EvaluationPeriod $period): array
    {
        $from = $period->start_date?->format('Y-m-d');
        $to = $period->end_date?->format('Y-m-d');

        $q = AttendanceRecord::query()
            ->where('school_year_id', $schoolYearId)
            ->where('student_id', $studentId);

        if ($from) {
            $q->whereDate('attendance_date', '>=', $from);
        }
        if ($to) {
            $q->whereDate('attendance_date', '<=', $to);
        }

        $absent = (clone $q)->where('attendance_status', 'absent')->count();
        $late = (clone $q)->where('attendance_status', 'late')->count();

        return [(int) $absent, (int) $late];
    }
}

