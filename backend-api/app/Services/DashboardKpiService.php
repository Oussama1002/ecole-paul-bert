<?php

namespace App\Services;

use App\Models\AttendanceRecord;
use App\Models\Enrollment;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\SchoolYear;
use App\Models\Teacher;
use App\Models\TeacherAttendance;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Aggregates the headline KPI payload for the upgraded dashboard
 * (GET /api/v1/dashboard/kpis). One call, four KPI groups + a recent
 * activity feed, all scoped to the active (or requested) school year.
 *
 * Trend conventions:
 *  - enrollment / finance trends are PERCENT change vs the previous period.
 *  - attendance trend is a DIFFERENCE in percentage points (rate - rate).
 */
class DashboardKpiService
{
    /** Enrollment statuses that count as an active student. */
    private const ACTIVE_STATUSES = ['enrolled', 're_enrolled', 'transferred_in'];

    /**
     * @return array<string, mixed>
     */
    public function build(?int $schoolYearId = null): array
    {
        $year = $schoolYearId
            ? SchoolYear::find($schoolYearId)
            : SchoolYear::where('is_current', true)->first();

        if (! $year) {
            return $this->emptyPayload();
        }

        $now = CarbonImmutable::now();

        return [
            'school_year' => [
                'id' => $year->id,
                'name' => $year->name,
            ],
            'enrollment' => $this->enrollment($year->id, $now),
            'attendance' => $this->attendance($year->id, $now),
            'finance' => $this->finance($year->id, $now),
            'teachers' => $this->teachers($now),
            'recent_activity' => $this->recentActivity($year->id),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function enrollment(int $yearId, CarbonImmutable $now): array
    {
        $totalStudents = (int) Enrollment::where('school_year_id', $yearId)
            ->whereIn('academic_status', self::ACTIVE_STATUSES)
            ->distinct('student_id')
            ->count('student_id');

        $monthStart = $now->startOfMonth();
        $monthEnd = $now->endOfMonth();
        $lastMonthStart = $monthStart->subMonthNoOverflow();
        $lastMonthEnd = $lastMonthStart->endOfMonth();

        $newThisMonth = (int) Enrollment::where('school_year_id', $yearId)
            ->where('admission_type', 'new')
            ->whereBetween('enrollment_date', [$monthStart, $monthEnd])
            ->count();

        $newLastMonth = (int) Enrollment::where('school_year_id', $yearId)
            ->where('admission_type', 'new')
            ->whereBetween('enrollment_date', [$lastMonthStart, $lastMonthEnd])
            ->count();

        return [
            'total_students' => $totalStudents,
            'new_this_month' => $newThisMonth,
            'trend_vs_last_month' => $this->percentChange($newThisMonth, $newLastMonth),
            'by_level' => $this->enrollmentByLevel($yearId),
        ];
    }

    /**
     * Active students grouped by level (via class → level), ordered by the
     * level's sort_order. Students without a resolvable level are skipped.
     *
     * @return list<array{level: string, count: int}>
     */
    private function enrollmentByLevel(int $yearId): array
    {
        $rows = Enrollment::query()
            ->where('enrollments.school_year_id', $yearId)
            ->whereIn('enrollments.academic_status', self::ACTIVE_STATUSES)
            ->join('classes', 'classes.id', '=', 'enrollments.class_id')
            ->join('levels', 'levels.id', '=', 'classes.level_id')
            ->groupBy('levels.id', 'levels.name', 'levels.sort_order')
            ->orderBy('levels.sort_order')
            ->orderBy('levels.name')
            ->get([
                'levels.name as level',
                DB::raw('COUNT(DISTINCT enrollments.student_id) as count'),
            ]);

        return $rows->map(fn ($r) => [
            'level' => (string) $r->level,
            'count' => (int) $r->count,
        ])->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function attendance(int $yearId, CarbonImmutable $now): array
    {
        $today = $now->toDateString();

        $absencesToday = (int) AttendanceRecord::whereDate('attendance_date', $today)
            ->where('attendance_status', 'absent')
            ->count();

        $latesToday = (int) AttendanceRecord::whereDate('attendance_date', $today)
            ->where('attendance_status', 'late')
            ->count();

        $thisWeekStart = $now->startOfWeek();
        $lastWeekStart = $thisWeekStart->subWeek();
        $lastWeekEnd = $thisWeekStart->subDay()->endOfDay();

        $rateThisWeek = $this->presenceRate($yearId, $thisWeekStart, $now->endOfDay());
        $rateLastWeek = $this->presenceRate($yearId, $lastWeekStart, $lastWeekEnd);

        return [
            'rate_this_week' => $rateThisWeek,
            'rate_last_week' => $rateLastWeek,
            'absences_today' => $absencesToday,
            'lates_today' => $latesToday,
            // Points difference, not percent change.
            'trend_vs_last_week' => round($rateThisWeek - $rateLastWeek, 1),
        ];
    }

    /**
     * Presence rate (%) over a date range: present / total marked records.
     * "Late" counts as present-but-late (i.e. not an absence).
     */
    private function presenceRate(int $yearId, CarbonImmutable $from, CarbonImmutable $to): float
    {
        $base = AttendanceRecord::where('school_year_id', $yearId)
            ->whereBetween('attendance_date', [$from->toDateString(), $to->toDateString()]);

        $total = (int) (clone $base)->count();
        if ($total === 0) {
            return 0.0;
        }

        $present = (int) (clone $base)
            ->whereIn('attendance_status', ['present', 'late'])
            ->count();

        return round($present / $total * 100, 1);
    }

    /**
     * @return array<string, mixed>
     */
    private function finance(int $yearId, CarbonImmutable $now): array
    {
        $monthStart = $now->startOfMonth();
        $monthEnd = $now->endOfMonth();
        $lastMonthStart = $monthStart->subMonthNoOverflow();
        $lastMonthEnd = $lastMonthStart->endOfMonth();

        $unpaidBase = Invoice::where('school_year_id', $yearId)
            ->where('status', '!=', 'cancelled')
            ->where('amount_due', '>', 0);

        $unpaidCount = (int) (clone $unpaidBase)->count();
        $unpaidTotal = (float) (clone $unpaidBase)->sum('amount_due');

        $confirmed = fn () => Payment::where('status', 'confirmed')
            ->whereNull('cancelled_at')
            ->where('school_year_id', $yearId);

        $paymentsThisMonth = (float) $confirmed()
            ->whereBetween('payment_date', [$monthStart, $monthEnd])
            ->sum('amount');

        $paymentsLastMonth = (float) $confirmed()
            ->whereBetween('payment_date', [$lastMonthStart, $lastMonthEnd])
            ->sum('amount');

        // Collection rate across the year's invoices: paid / billed.
        $invoiceTotals = Invoice::where('school_year_id', $yearId)
            ->where('status', '!=', 'cancelled')
            ->selectRaw('COALESCE(SUM(total_amount),0) as billed, COALESCE(SUM(amount_paid),0) as paid')
            ->first();

        $billed = (float) ($invoiceTotals->billed ?? 0);
        $paid = (float) ($invoiceTotals->paid ?? 0);
        $collectionRate = $billed > 0 ? round($paid / $billed * 100, 1) : 0.0;

        $expensesThisMonth = (float) Expense::where('school_year_id', $yearId)
            ->where('status', 'active')
            ->whereBetween('expense_date', [$monthStart, $monthEnd])
            ->sum('amount');

        return [
            'unpaid_invoices_count' => $unpaidCount,
            'unpaid_invoices_total' => round($unpaidTotal, 2),
            'payments_this_month' => round($paymentsThisMonth, 2),
            'payments_last_month' => round($paymentsLastMonth, 2),
            'collection_rate' => $collectionRate,
            'trend_vs_last_month' => $this->percentChange($paymentsThisMonth, $paymentsLastMonth),
            'expenses_this_month' => round($expensesThisMonth, 2),
        ];
    }

    /**
     * @return array{total_active: int, present_today: int}
     */
    private function teachers(CarbonImmutable $now): array
    {
        $totalActive = (int) Teacher::where('status', 'active')->count();

        $absentToday = (int) TeacherAttendance::whereDate('attendance_date', $now->toDateString())
            ->where('status', 'absent')
            ->count();

        return [
            'total_active' => $totalActive,
            'present_today' => max(0, $totalActive - $absentToday),
        ];
    }

    /**
     * Merged, most-recent-first feed of enrollments and payments.
     *
     * @return list<array{type: string, message: string, timestamp: string}>
     */
    private function recentActivity(int $yearId, int $limit = 10): array
    {
        $items = [];

        $enrollments = Enrollment::with(['student', 'schoolClass'])
            ->where('school_year_id', $yearId)
            ->whereIn('academic_status', self::ACTIVE_STATUSES)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        foreach ($enrollments as $e) {
            $student = $e->student;
            if (! $student) {
                continue;
            }
            $name = trim(($student->last_name ?? '').' '.($student->first_name ?? ''));
            $class = $e->schoolClass?->name;
            $items[] = [
                'type' => 'enrollment',
                'message' => 'Nouvel élève: '.($name ?: 'élève #'.$student->id)
                    .($class ? ' ('.$class.')' : ''),
                'timestamp' => optional($e->created_at)->toIso8601String(),
                '_sort' => optional($e->created_at)->getTimestamp() ?? 0,
            ];
        }

        $payments = Payment::with('student')
            ->where('school_year_id', $yearId)
            ->where('status', 'confirmed')
            ->whereNull('cancelled_at')
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        foreach ($payments as $p) {
            $name = $p->student
                ? trim(($p->student->last_name ?? '').' '.($p->student->first_name ?? ''))
                : '';
            $items[] = [
                'type' => 'payment',
                'message' => 'Paiement reçu: '.$this->formatAmount((float) $p->amount).' MAD'
                    .($name !== '' ? ' - '.$name : ''),
                'timestamp' => optional($p->created_at ?? $p->payment_date)->toIso8601String(),
                '_sort' => optional($p->created_at ?? $p->payment_date)->getTimestamp() ?? 0,
            ];
        }

        usort($items, static fn ($a, $b) => $b['_sort'] <=> $a['_sort']);

        return array_map(static function (array $row) {
            unset($row['_sort']);

            return $row;
        }, array_slice($items, 0, $limit));
    }

    /**
     * Percent change from $previous to $current, rounded to 1 decimal.
     * Returns 0.0 when there is no prior baseline (avoids divide-by-zero
     * and a misleading "+100%" spike from a zero base).
     */
    private function percentChange(float $current, float $previous): float
    {
        if ($previous <= 0.0) {
            return 0.0;
        }

        return round(($current - $previous) / $previous * 100, 1);
    }

    private function formatAmount(float $amount): string
    {
        return number_format($amount, 0, ',', ' ');
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyPayload(): array
    {
        return [
            'school_year' => null,
            'enrollment' => [
                'total_students' => 0,
                'new_this_month' => 0,
                'trend_vs_last_month' => 0.0,
                'by_level' => [],
            ],
            'attendance' => [
                'rate_this_week' => 0.0,
                'rate_last_week' => 0.0,
                'absences_today' => 0,
                'lates_today' => 0,
                'trend_vs_last_week' => 0.0,
            ],
            'finance' => [
                'unpaid_invoices_count' => 0,
                'unpaid_invoices_total' => 0.0,
                'payments_this_month' => 0.0,
                'payments_last_month' => 0.0,
                'collection_rate' => 0.0,
                'trend_vs_last_month' => 0.0,
                'expenses_this_month' => 0.0,
            ],
            'teachers' => [
                'total_active' => 0,
                'present_today' => 0,
            ],
            'recent_activity' => [],
        ];
    }
}
