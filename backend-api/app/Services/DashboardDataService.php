<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\AttendanceRecord;
use App\Models\Enrollment;
use App\Models\Expense;
use App\Models\Grade;
use App\Models\InternalNotification;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TeacherClassSubject;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardDataService
{
    /**
     * @return array<string, mixed>
     */
    public function build(User $user, ?int $schoolYearId = null): array
    {
        $perms = $user->getEffectivePermissionCodes();
        $roleCode = $user->role?->code ?? '';

        $resolvedYearId = $schoolYearId
            ?? SchoolYear::query()->where('is_current', true)->value('id');

        $kind = $this->resolveDashboardKind($roleCode);

        $classIdsScope = null;
        if ($roleCode === 'teacher') {
            $teacher = Teacher::query()->where('user_id', $user->id)->first();
            $classIdsScope = $teacher
                ? TeacherClassSubject::query()
                    ->where('teacher_id', $teacher->id)
                    ->pluck('class_id')
                    ->unique()
                    ->filter()
                    ->values()
                    ->all()
                : [];
        }

        $today = Carbon::today();

        $data = [
            'dashboard_kind' => $kind,
            'role_code' => $roleCode,
            'school_year_id' => $resolvedYearId,
            'kpis' => [],
            'attendance_today' => null,
            'attendance_last_7_days' => [],
            'averages_by_class' => [],
            'alerts' => [],
            'unpaid' => null,
            'finance_summary' => null,
            'payments_by_month' => [],
            'recent_announcements' => [],
            'shortcuts' => $this->shortcutsFor($perms, $kind),
        ];

        if (in_array('students.view', $perms, true)) {
            $data['kpis']['total_students'] = $this->countStudents($resolvedYearId);
        }

        if (in_array('teachers.view', $perms, true)) {
            $data['kpis']['total_teachers'] = Teacher::query()
                ->where('status', 'active')
                ->count();
        }

        if (in_array('classes.view', $perms, true)) {
            $data['kpis']['total_classes'] = $this->countClasses($resolvedYearId);
        }

        if (in_array('attendance.view', $perms, true)) {
            $data['attendance_today'] = $this->attendanceToday($today, $classIdsScope);
            $data['attendance_last_7_days'] = $this->attendanceAbsencesLast7Days($today, $resolvedYearId, $classIdsScope);
        }

        if (in_array('grades.view', $perms, true)) {
            $data['averages_by_class'] = $this->averagesByClass($resolvedYearId);
        }

        $data['alerts'] = $this->buildAlerts($user, $perms, $classIdsScope);

        if (in_array('finance.view', $perms, true)) {
            $data['unpaid'] = $this->unpaidSummary($resolvedYearId);
            $data['finance_summary'] = $this->financeTotals($resolvedYearId);
            if ($kind === 'accountant' || in_array($roleCode, ['super_admin', 'admin', 'school_office', 'director', 'pedagogical_manager'], true)) {
                $data['payments_by_month'] = $this->paymentsByMonth(6, $resolvedYearId);
            }
        }

        if (Schema::hasTable('announcements')) {
            $data['recent_announcements'] = $this->recentAnnouncements();
        }

        return $data;
    }

    private function resolveDashboardKind(string $roleCode): string
    {
        return match ($roleCode) {
            'super_admin', 'admin', 'school_office' => 'admin',
            'director', 'pedagogical_manager' => 'direction',
            'teacher' => 'teacher',
            'accountant' => 'accountant',
            'hr' => 'hr',
            default => 'minimal',
        };
    }

    /**
     * @param  list<string>  $perms
     * @return list<array{label: string, path: string, permission: string}>
     */
    private function shortcutsFor(array $perms, string $kind): array
    {
        $candidates = [
            ['label' => 'Élèves', 'path' => '/eleves', 'permission' => 'students.view'],
            ['label' => 'Enseignants', 'path' => '/enseignants', 'permission' => 'teachers.view'],
            ['label' => 'Classes', 'path' => '/parametrage/classes', 'permission' => 'classes.view'],
            ['label' => 'Emploi du temps', 'path' => '/emploi-du-temps', 'permission' => 'schedule.view'],
            ['label' => 'Assiduité', 'path' => '/assiduite/stats', 'permission' => 'attendance.view'],
            ['label' => 'Marquage présences', 'path' => '/assiduite/marquage', 'permission' => 'attendance.manage'],
            ['label' => 'Notes (classe)', 'path' => '/notes/saisie-classe', 'permission' => 'grades.manage'],
            ['label' => 'Classement', 'path' => '/notes/classement', 'permission' => 'grades.view'],
            ['label' => 'Bulletins', 'path' => '/bulletins', 'permission' => 'report_cards.view'],
            ['label' => 'Finance', 'path' => '/finance', 'permission' => 'finance.view'],
            ['label' => 'Paiements', 'path' => '/finance/paiements', 'permission' => 'finance.view'],
            ['label' => 'Documents', 'path' => '/documents', 'permission' => 'documents.view'],
            ['label' => 'Utilisateurs', 'path' => '/utilisateurs', 'permission' => 'users.view'],
        ];

        if ($kind === 'accountant') {
            $candidates = array_values(array_filter(
                $candidates,
                static fn (array $s) => str_starts_with($s['path'], '/finance')
            ));
        }

        $out = [];
        foreach ($candidates as $row) {
            if (in_array($row['permission'], $perms, true)) {
                $out[] = $row;
            }
        }

        return $out;
    }

    private function countStudents(?int $schoolYearId): int
    {
        if ($schoolYearId) {
            return (int) Enrollment::query()
                ->where('school_year_id', $schoolYearId)
                ->whereNotIn('academic_status', ['cancelled', 'completed', 'transferred_out'])
                ->distinct('student_id')
                ->count('student_id');
        }

        return (int) Student::query()->where('status', 'active')->count();
    }

    private function countClasses(?int $schoolYearId): int
    {
        $q = SchoolClass::query()->where('status', 'active');
        if ($schoolYearId) {
            $q->where('school_year_id', $schoolYearId);
        }

        return (int) $q->count();
    }

    /**
     * @param  list<int>|null  $classIdsScope
     * @return array{absences: int, lates: int, present: int}
     */
    private function attendanceToday(Carbon $today, ?array $classIdsScope): array
    {
        $q = AttendanceRecord::query()->whereDate('attendance_date', $today->toDateString());
        if ($classIdsScope !== null) {
            if ($classIdsScope === []) {
                return ['absences' => 0, 'lates' => 0, 'present' => 0];
            }
            $q->whereIn('class_id', $classIdsScope);
        }

        return [
            'absences' => (int) (clone $q)->where('attendance_status', 'absent')->count(),
            'lates' => (int) (clone $q)->where('attendance_status', 'late')->count(),
            'present' => (int) (clone $q)->where('attendance_status', 'present')->count(),
        ];
    }

    /**
     * @param  list<int>|null  $classIdsScope
     * @return list<array{date: string, absences: int}>
     */
    private function attendanceAbsencesLast7Days(Carbon $today, ?int $schoolYearId, ?array $classIdsScope): array
    {
        $series = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = $today->copy()->subDays($i);
            $q = AttendanceRecord::query()
                ->whereDate('attendance_date', $d->toDateString())
                ->where('attendance_status', 'absent');
            if ($schoolYearId) {
                $q->where('school_year_id', $schoolYearId);
            }
            if ($classIdsScope !== null) {
                if ($classIdsScope === []) {
                    $series[] = ['date' => $d->toDateString(), 'absences' => 0];

                    continue;
                }
                $q->whereIn('class_id', $classIdsScope);
            }
            $series[] = [
                'date' => $d->toDateString(),
                'absences' => (int) $q->count(),
            ];
        }

        return $series;
    }

    /**
     * @return list<array{class_id: int, class_name: string, class_code: string|null, average: float|null}>
     */
    private function averagesByClass(?int $schoolYearId): array
    {
        $q = Grade::query()
            ->select([
                'class_id',
                DB::raw('AVG(weighted_score) as avg_weighted'),
            ])
            ->whereNotNull('weighted_score')
            ->groupBy('class_id');

        if ($schoolYearId) {
            $q->where('school_year_id', $schoolYearId);
        }

        $rows = $q->get()->keyBy('class_id');
        if ($rows->isEmpty()) {
            return [];
        }

        $classes = SchoolClass::query()
            ->whereIn('id', $rows->keys()->all())
            ->get()
            ->keyBy('id');

        $out = [];
        foreach ($rows as $classId => $row) {
            $c = $classes->get($classId);
            $out[] = [
                'class_id' => (int) $classId,
                'class_name' => $c ? (string) $c->name : 'Classe #'.$classId,
                'class_code' => $c?->code,
                'average' => $row->avg_weighted !== null ? round((float) $row->avg_weighted, 2) : null,
            ];
        }

        usort($out, static fn (array $a, array $b) => strcmp($a['class_name'], $b['class_name']));

        return $out;
    }

    /**
     * @param  list<int>|null  $classIdsScope
     * @return list<array<string, mixed>>
     */
    private function buildAlerts(User $user, array $perms, ?array $classIdsScope): array
    {
        $alerts = [];

        $notifs = InternalNotification::query()
            ->where('user_id', $user->id)
            ->orderByRaw('read_at is null desc')
            ->orderByDesc('created_at')
            ->limit(12)
            ->get();

        foreach ($notifs as $n) {
            $severity = str_starts_with((string) $n->type, 'attendance.alert.') ? 'warning' : 'info';
            $alerts[] = [
                'type' => 'notification',
                'id' => $n->id,
                'severity' => $severity,
                'title' => $n->title,
                'body' => $n->body,
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at?->toIso8601String(),
            ];
        }

        return $alerts;
    }

    /**
     * @return array{unpaid_invoices: int, unpaid_amount: float, overdue_invoices: int}
     */
    private function unpaidSummary(?int $schoolYearId): array
    {
        $base = Invoice::query()->where('status', '!=', 'cancelled')->where('amount_due', '>', 0);
        if ($schoolYearId) {
            $base->where('school_year_id', $schoolYearId);
        }
        $unpaidCount = (int) (clone $base)->count();
        $unpaidAmount = (float) (clone $base)->sum('amount_due');

        $overdue = Invoice::query()
            ->where('status', '!=', 'cancelled')
            ->where('amount_due', '>', 0)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', now()->toDateString());
        if ($schoolYearId) {
            $overdue->where('school_year_id', $schoolYearId);
        }

        return [
            'unpaid_invoices' => $unpaidCount,
            'unpaid_amount' => round($unpaidAmount, 2),
            'overdue_invoices' => (int) $overdue->count(),
        ];
    }

    /**
     * @return array{revenue_total: float, expenses_total: float, net_total: float, unpaid_total: float}
     */
    private function financeTotals(?int $schoolYearId): array
    {
        $paymentsQ = Payment::query()->where('status', 'confirmed');
        $expensesQ = Expense::query()->where('status', 'active');
        $invoicesQ = Invoice::query()->where('status', '!=', 'cancelled');
        if ($schoolYearId) {
            $paymentsQ->where('school_year_id', $schoolYearId);
            $expensesQ->where('school_year_id', $schoolYearId);
            $invoicesQ->where('school_year_id', $schoolYearId);
        }

        $revenue = (float) $paymentsQ->sum('amount');
        $expenses = (float) $expensesQ->sum('amount');
        $unpaid = (float) $invoicesQ->sum('amount_due');

        return [
            'revenue_total' => round($revenue, 2),
            'expenses_total' => round($expenses, 2),
            'net_total' => round($revenue - $expenses, 2),
            'unpaid_total' => round($unpaid, 2),
        ];
    }

    /**
     * @return list<array{period: string, total: float}>
     */
    private function paymentsByMonth(int $monthsBack, ?int $schoolYearId): array
    {
        $from = Carbon::now()->startOfMonth()->subMonths($monthsBack - 1);

        $q = Payment::query()
            ->where('status', 'confirmed')
            ->where('payment_date', '>=', $from->toDateString());
        if ($schoolYearId) {
            $q->where('school_year_id', $schoolYearId);
        }

        $rows = $q->selectRaw("DATE_FORMAT(payment_date, '%Y-%m') as period, SUM(amount) as total")
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        return $rows->map(fn ($r) => [
            'period' => (string) $r->period,
            'total' => round((float) $r->total, 2),
        ])->all();
    }

    /**
     * @return list<array{id: int, title: string, body: string|null, published_at: string|null}>
     */
    private function recentAnnouncements(): array
    {
        $today = now()->toDateString();

        $q = Announcement::query();

        if (Schema::hasColumn('announcements', 'status')) {
            $q->where('status', 'published');
        }

        $hasStart = Schema::hasColumn('announcements', 'start_date');
        $hasEnd = Schema::hasColumn('announcements', 'end_date');

        if ($hasStart) {
            $q->where(function ($q) use ($today) {
                $q->whereNull('start_date')->orWhereDate('start_date', '<=', $today);
            });
        }
        if ($hasEnd) {
            $q->where(function ($q) use ($today) {
                $q->whereNull('end_date')->orWhereDate('end_date', '>=', $today);
            });
        }

        if ($hasStart) {
            $q->orderByDesc('start_date');
        }

        return $q
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (Announcement $a) => [
                'id' => $a->id,
                'title' => $a->title,
                'body' => $a->content,
                'published_at' => $hasStart
                    ? $a->start_date?->toIso8601String()
                    : $a->created_at?->toIso8601String(),
            ])
            ->all();
    }
}
