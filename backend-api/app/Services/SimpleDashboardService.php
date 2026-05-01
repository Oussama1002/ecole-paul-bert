<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\FeeType;
use App\Models\Payment;
use App\Models\SchoolYear;
use App\Models\TeacherAttendance;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Compact KPI service for the simple-mode dashboard.
 * Scope kept intentionally small: 5 headline KPIs + a 6-month revenue trend.
 * Does NOT replace the richer DashboardDataService used in advanced mode.
 */
class SimpleDashboardService
{
    public function build(?int $schoolYearId = null): array
    {
        $year = $schoolYearId
            ? SchoolYear::find($schoolYearId)
            : SchoolYear::where('is_current', true)->first();

        // Defensive fallback: no current year set yet.
        if (! $year) {
            return $this->emptyPayload();
        }

        $yearStart = CarbonImmutable::parse($year->start_date)->startOfDay();
        $yearEnd = CarbonImmutable::parse($year->end_date)->endOfDay();
        $today = CarbonImmutable::now();
        $monthStart = $today->startOfMonth();
        $monthEnd = $today->endOfMonth();

        $activeStatuses = ['enrolled', 're_enrolled', 'transferred_in'];
        $leftStatuses = ['transferred_out', 'cancelled', 'completed'];

        $totalStudents = Enrollment::where('school_year_id', $year->id)
            ->whereIn('academic_status', $activeStatuses)
            ->distinct('student_id')
            ->count('student_id');

        $newRegistrations = Enrollment::where('school_year_id', $year->id)
            ->where('admission_type', 'new')
            ->count();

        $studentsLeft = Enrollment::where('school_year_id', $year->id)
            ->whereIn('academic_status', $leftStatuses)
            ->count();

        $registrationFeeTypeIds = FeeType::where(function ($q) {
                $q->where('code', 'like', '%inscr%')
                    ->orWhere('code', 'like', '%regist%')
                    ->orWhere('name', 'like', '%inscription%')
                    ->orWhere('name', 'like', '%registration%');
            })
            ->pluck('id');

        $confirmedPayments = Payment::where('status', 'confirmed')
            ->whereNull('cancelled_at');

        $registrationRevenue = (float) (clone $confirmedPayments)
            ->where('school_year_id', $year->id)
            ->whereIn(
                'fee_assignment_id',
                DB::table('fee_assignments')
                    ->whereIn('fee_type_id', $registrationFeeTypeIds)
                    ->pluck('id')
            )
            ->sum('amount');

        $monthlyRevenue = (float) (clone $confirmedPayments)
            ->whereBetween('payment_date', [$monthStart, $monthEnd])
            ->sum('amount');

        $globalRevenue = (float) (clone $confirmedPayments)
            ->whereBetween('payment_date', [$yearStart, $yearEnd])
            ->sum('amount');

        $monthlyTrend = $this->buildMonthlyTrend($today);

        $teacherAbsencesToday = TeacherAttendance::whereDate('date', $today->toDateString())
            ->where('status', 'absent')
            ->count();

        return [
            'school_year' => [
                'id' => $year->id,
                'name' => $year->name,
                'start_date' => $year->start_date,
                'end_date' => $year->end_date,
            ],
            'kpis' => [
                'total_students' => $totalStudents,
                'new_registrations' => $newRegistrations,
                'students_left' => $studentsLeft,
                'registration_revenue' => $registrationRevenue,
                'monthly_revenue' => $monthlyRevenue,
                'global_revenue' => $globalRevenue,
                'teacher_absences_today' => $teacherAbsencesToday,
            ],
            'revenue_trend' => $monthlyTrend,
        ];
    }

    /**
     * Last 6 months of confirmed payments — [{label, amount}], oldest first.
     */
    private function buildMonthlyTrend(CarbonImmutable $today): array
    {
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $start = $today->subMonthsNoOverflow($i)->startOfMonth();
            $end = $start->endOfMonth();

            $amount = (float) Payment::where('status', 'confirmed')
                ->whereNull('cancelled_at')
                ->whereBetween('payment_date', [$start, $end])
                ->sum('amount');

            $months[] = [
                'key' => $start->format('Y-m'),
                'label' => $this->frenchMonth($start),
                'amount' => $amount,
            ];
        }

        return $months;
    }

    private function frenchMonth(CarbonImmutable $d): string
    {
        $labels = [
            1 => 'janv.', 2 => 'févr.', 3 => 'mars', 4 => 'avr.',
            5 => 'mai', 6 => 'juin', 7 => 'juil.', 8 => 'août',
            9 => 'sept.', 10 => 'oct.', 11 => 'nov.', 12 => 'déc.',
        ];

        return $labels[(int) $d->format('n')] . ' ' . $d->format('y');
    }

    private function emptyPayload(): array
    {
        return [
            'school_year' => null,
            'kpis' => [
                'total_students' => 0,
                'new_registrations' => 0,
                'students_left' => 0,
                'registration_revenue' => 0.0,
                'monthly_revenue' => 0.0,
                'global_revenue' => 0.0,
                'teacher_absences_today' => 0,
            ],
            'revenue_trend' => [],
        ];
    }
}
