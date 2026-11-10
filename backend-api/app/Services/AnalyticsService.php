<?php

namespace App\Services;

use App\Models\SchoolYear;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Cross-school-year analytics. Every metric is computed with aggregate SQL
 * (SUM / COUNT / AVG / GROUP BY) — collections are never hydrated into memory.
 *
 * Year label = SchoolYear::name (e.g. "2026-2027"); years are returned oldest
 * first so trend charts read left → right in chronological order.
 */
class AnalyticsService
{
    /** Normalised grade expression: bring every score onto a /20 scale. */
    private const GRADE_ON_20 = 'score / NULLIF(max_score, 0) * 20';

    /** Pass threshold on /20. */
    private const PASS_THRESHOLD = 10.0;

    /** @return Collection<int, SchoolYear> oldest → newest */
    private function years(): Collection
    {
        return SchoolYear::query()
            ->orderBy('start_date')
            ->get(['id', 'name', 'start_date', 'end_date', 'is_current']);
    }

    private function label(SchoolYear $year): string
    {
        $name = trim((string) $year->name);
        if ($name !== '') {
            return $name;
        }

        $start = $year->start_date?->format('Y');
        $end = $year->end_date?->format('Y');

        return $start && $end ? "{$start}-{$end}" : (string) $year->id;
    }

    // ── Enrollment ───────────────────────────────────────────────────────────

    /** @return list<array<string, mixed>> */
    public function getEnrollmentTrends(): array
    {
        $years = $this->years();
        $out = [];
        $prevStudentIds = [];

        foreach ($years as $year) {
            $base = DB::table('enrollments')
                ->where('school_year_id', $year->id)
                ->where('academic_status', '!=', 'cancelled');

            $total = (clone $base)->distinct()->count('student_id');

            $byLevel = DB::table('enrollments as e')
                ->join('classes as c', 'c.id', '=', 'e.class_id')
                ->join('levels as l', 'l.id', '=', 'c.level_id')
                ->where('e.school_year_id', $year->id)
                ->where('e.academic_status', '!=', 'cancelled')
                ->groupBy('l.id', 'l.name', 'l.sort_order')
                ->orderBy('l.sort_order')
                ->select('l.name', DB::raw('COUNT(DISTINCT e.student_id) as total'))
                ->get()
                ->map(fn ($r) => ['level' => $r->name, 'total' => (int) $r->total])
                ->all();

            $byGenderRaw = DB::table('enrollments as e')
                ->join('students as s', 's.id', '=', 'e.student_id')
                ->where('e.school_year_id', $year->id)
                ->where('e.academic_status', '!=', 'cancelled')
                ->groupBy('s.gender')
                ->select('s.gender', DB::raw('COUNT(DISTINCT e.student_id) as total'))
                ->pluck('total', 'gender');

            $byGender = [
                'M' => (int) ($byGenderRaw['male'] ?? 0),
                'F' => (int) ($byGenderRaw['female'] ?? 0),
                'O' => (int) ($byGenderRaw['other'] ?? 0),
            ];

            $studentIds = DB::table('enrollments')
                ->where('school_year_id', $year->id)
                ->where('academic_status', '!=', 'cancelled')
                ->distinct()
                ->pluck('student_id')
                ->all();

            $prevLookup = array_flip($prevStudentIds);
            $new = 0;
            foreach ($studentIds as $sid) {
                if (! isset($prevLookup[$sid])) {
                    $new++;
                }
            }
            // First year in the dataset has no baseline → everyone counts as new.
            $returning = $total - $new;

            $out[] = [
                'year' => $this->label($year),
                'school_year_id' => (int) $year->id,
                'is_current' => (bool) $year->is_current,
                'total' => $total,
                'by_level' => $byLevel,
                'by_gender' => $byGender,
                'new' => $new,
                'returning' => max(0, $returning),
            ];

            $prevStudentIds = $studentIds;
        }

        return $out;
    }

    // ── Finance ──────────────────────────────────────────────────────────────

    /** @return list<array<string, mixed>> */
    public function getFinanceTrends(?string $monthlyYear = null): array
    {
        $years = $this->years();
        $out = [];

        foreach ($years as $year) {
            $invoiced = (float) DB::table('invoices')
                ->where('school_year_id', $year->id)
                ->where('status', '!=', 'cancelled')
                ->sum('total_amount');

            $collected = (float) DB::table('payments')
                ->where('school_year_id', $year->id)
                ->where('status', 'confirmed')
                ->sum('amount');

            $expenses = (float) DB::table('expenses')
                ->where('school_year_id', $year->id)
                ->where('status', '!=', 'cancelled')
                ->sum('amount');

            $rate = $invoiced > 0 ? round($collected / $invoiced * 100, 1) : 0.0;

            $row = [
                'year' => $this->label($year),
                'school_year_id' => (int) $year->id,
                'is_current' => (bool) $year->is_current,
                'invoiced' => round($invoiced, 2),
                'collected' => round($collected, 2),
                'collection_rate' => $rate,
                'expenses' => round($expenses, 2),
                'net' => round($collected - $expenses, 2),
                'monthly' => [],
            ];

            if ($monthlyYear !== null && $this->label($year) === $monthlyYear) {
                $row['monthly'] = $this->financeMonthly((int) $year->id);
            }

            $out[] = $row;
        }

        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function financeMonthly(int $yearId): array
    {
        $collected = DB::table('payments')
            ->where('school_year_id', $yearId)
            ->where('status', 'confirmed')
            ->groupByRaw('MONTH(payment_date)')
            ->selectRaw('MONTH(payment_date) as m, SUM(amount) as total')
            ->pluck('total', 'm');

        $invoiced = DB::table('invoices')
            ->where('school_year_id', $yearId)
            ->where('status', '!=', 'cancelled')
            ->groupByRaw('MONTH(issue_date)')
            ->selectRaw('MONTH(issue_date) as m, SUM(total_amount) as total')
            ->pluck('total', 'm');

        $expenses = DB::table('expenses')
            ->where('school_year_id', $yearId)
            ->where('status', '!=', 'cancelled')
            ->groupByRaw('MONTH(expense_date)')
            ->selectRaw('MONTH(expense_date) as m, SUM(amount) as total')
            ->pluck('total', 'm');

        $labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        $months = [];
        for ($m = 1; $m <= 12; $m++) {
            $months[] = [
                'month' => $labels[$m - 1],
                'invoiced' => round((float) ($invoiced[$m] ?? 0), 2),
                'collected' => round((float) ($collected[$m] ?? 0), 2),
                'expenses' => round((float) ($expenses[$m] ?? 0), 2),
            ];
        }

        return $months;
    }

    // ── Attendance ───────────────────────────────────────────────────────────

    /** @return list<array<string, mixed>> */
    public function getAttendanceTrends(?string $monthlyYear = null): array
    {
        $years = $this->years();
        $out = [];

        foreach ($years as $year) {
            $agg = DB::table('attendance_records')
                ->where('school_year_id', $year->id)
                ->selectRaw('COUNT(*) as total')
                ->selectRaw("SUM(attendance_status = 'absent') as absents")
                ->selectRaw("SUM(attendance_status = 'late') as lates")
                ->first();

            $total = (int) ($agg->total ?? 0);
            $absents = (int) ($agg->absents ?? 0);
            $lates = (int) ($agg->lates ?? 0);
            // Attendance rate: a day is "attended" unless marked absent.
            $rate = $total > 0 ? round(($total - $absents) / $total * 100, 1) : 0.0;

            $row = [
                'year' => $this->label($year),
                'school_year_id' => (int) $year->id,
                'is_current' => (bool) $year->is_current,
                'avg_rate' => $rate,
                'total_absences' => $absents,
                'total_lates' => $lates,
                'monthly' => [],
            ];

            if ($monthlyYear !== null && $this->label($year) === $monthlyYear) {
                $row['monthly'] = $this->attendanceMonthly((int) $year->id);
            }

            $out[] = $row;
        }

        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function attendanceMonthly(int $yearId): array
    {
        $rows = DB::table('attendance_records')
            ->where('school_year_id', $yearId)
            ->groupBy(DB::raw('MONTH(attendance_date)'))
            ->selectRaw('MONTH(attendance_date) as m')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(attendance_status = 'absent') as absents")
            ->get()
            ->keyBy('m');

        $labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        $months = [];
        for ($m = 1; $m <= 12; $m++) {
            $r = $rows[$m] ?? null;
            $total = $r ? (int) $r->total : 0;
            $absents = $r ? (int) $r->absents : 0;
            $months[] = [
                'month' => $labels[$m - 1],
                'rate' => $total > 0 ? round(($total - $absents) / $total * 100, 1) : 0.0,
            ];
        }

        return $months;
    }

    // ── Grades ───────────────────────────────────────────────────────────────

    /** @return list<array<string, mixed>> */
    public function getGradeTrends(): array
    {
        $years = $this->years();
        $out = [];

        foreach ($years as $year) {
            $avg = DB::table('grades')
                ->where('school_year_id', $year->id)
                ->avg(DB::raw(self::GRADE_ON_20));
            $avgGrade = $avg !== null ? round((float) $avg, 2) : 0.0;

            $byLevel = DB::table('grades as g')
                ->join('classes as c', 'c.id', '=', 'g.class_id')
                ->join('levels as l', 'l.id', '=', 'c.level_id')
                ->where('g.school_year_id', $year->id)
                ->groupBy('l.id', 'l.name', 'l.sort_order')
                ->orderBy('l.sort_order')
                ->select('l.name', DB::raw('AVG('.self::GRADE_ON_20.') as avg'))
                ->get()
                ->map(fn ($r) => ['level' => $r->name, 'avg_grade' => round((float) $r->avg, 2)])
                ->all();

            // Pass rate: students whose per-student /20 average ≥ threshold.
            $studentAvgSub = DB::table('grades')
                ->where('school_year_id', $year->id)
                ->groupBy('student_id')
                ->select('student_id', DB::raw('AVG('.self::GRADE_ON_20.') as avg'));

            $passAgg = DB::query()
                ->fromSub($studentAvgSub, 'sa')
                ->selectRaw('COUNT(*) as total')
                ->selectRaw('SUM(sa.avg >= ?) as passed', [self::PASS_THRESHOLD])
                ->first();

            $totalStudents = (int) ($passAgg->total ?? 0);
            $passed = (int) ($passAgg->passed ?? 0);
            $passRate = $totalStudents > 0 ? round($passed / $totalStudents * 100, 1) : 0.0;

            $subjectAverages = DB::table('grades as g')
                ->join('subjects as s', 's.id', '=', 'g.subject_id')
                ->where('g.school_year_id', $year->id)
                ->groupBy('s.id', 's.name')
                ->select('s.name', DB::raw('AVG('.self::GRADE_ON_20.') as avg'), DB::raw('COUNT(*) as n'))
                ->having('n', '>', 0)
                ->get()
                ->map(fn ($r) => ['subject' => $r->name, 'avg_grade' => round((float) $r->avg, 2)]);

            $sortedDesc = $subjectAverages->sortByDesc('avg_grade')->values();
            $topSubjects = $sortedDesc->take(3)->all();
            $bottomSubjects = $sortedDesc->reverse()->take(3)->values()->all();

            $out[] = [
                'year' => $this->label($year),
                'school_year_id' => (int) $year->id,
                'is_current' => (bool) $year->is_current,
                'avg_grade' => $avgGrade,
                'pass_rate' => $passRate,
                'by_level' => $byLevel,
                'top_subjects' => $topSubjects,
                'bottom_subjects' => $bottomSubjects,
            ];
        }

        return $out;
    }

    // ── Teachers ─────────────────────────────────────────────────────────────

    /** @return list<array<string, mixed>> */
    public function getTeacherTrends(): array
    {
        $years = $this->years();
        $out = [];

        foreach ($years as $year) {
            $total = (int) DB::table('teacher_class_subjects')
                ->where('school_year_id', $year->id)
                ->where('status', 'active')
                ->distinct()
                ->count('teacher_id');

            // Fallback for years with planning but no affectation rows yet.
            if ($total === 0) {
                $total = (int) DB::table('teachers')->where('status', 'active')->count();
            }

            $students = (int) DB::table('enrollments')
                ->where('school_year_id', $year->id)
                ->where('academic_status', '!=', 'cancelled')
                ->distinct()
                ->count('student_id');

            $classPairs = DB::table('teacher_class_subjects')
                ->where('school_year_id', $year->id)
                ->where('status', 'active')
                ->select('teacher_id', DB::raw('COUNT(DISTINCT class_id) as classes'))
                ->groupBy('teacher_id')
                ->pluck('classes');

            $avgClasses = $classPairs->count() > 0
                ? round((float) $classPairs->avg(), 1)
                : 0.0;

            $out[] = [
                'year' => $this->label($year),
                'school_year_id' => (int) $year->id,
                'is_current' => (bool) $year->is_current,
                'total' => $total,
                'student_teacher_ratio' => $total > 0 ? round($students / $total, 1) : 0.0,
                'avg_classes' => $avgClasses,
            ];
        }

        return $out;
    }

    // ── Summary ──────────────────────────────────────────────────────────────

    /**
     * One headline number per domain, per year, for the main dashboard.
     *
     * @return list<array<string, mixed>>
     */
    public function getSummary(): array
    {
        $enrollment = collect($this->getEnrollmentTrends())->keyBy('year');
        $finance = collect($this->getFinanceTrends())->keyBy('year');
        $attendance = collect($this->getAttendanceTrends())->keyBy('year');
        $grades = collect($this->getGradeTrends())->keyBy('year');
        $teachers = collect($this->getTeacherTrends())->keyBy('year');

        $out = [];
        foreach ($enrollment as $label => $row) {
            $out[] = [
                'year' => $label,
                'school_year_id' => $row['school_year_id'],
                'is_current' => $row['is_current'],
                'enrollment_total' => $row['total'],
                'collection_rate' => $finance[$label]['collection_rate'] ?? 0.0,
                'attendance_rate' => $attendance[$label]['avg_rate'] ?? 0.0,
                'avg_grade' => $grades[$label]['avg_grade'] ?? 0.0,
                'pass_rate' => $grades[$label]['pass_rate'] ?? 0.0,
                'student_teacher_ratio' => $teachers[$label]['student_teacher_ratio'] ?? 0.0,
            ];
        }

        return $out;
    }
}
