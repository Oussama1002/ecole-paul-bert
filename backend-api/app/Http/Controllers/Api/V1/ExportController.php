<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\AuditLog;
use App\Models\Enrollment;
use App\Models\EvaluationPeriod;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Grade;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Role;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeacherClassSubject;
use App\Models\User;
use App\Services\ExportService;
use App\Services\TeacherScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class ExportController extends Controller
{
    private const MAX_ROWS = 10000;

    private const PAYMENT_METHODS = [
        'cash' => 'Espèces',
        'card' => 'Carte',
        'transfer' => 'Virement',
        'check' => 'Chèque',
    ];

    private const INVOICE_STATUS = [
        'draft' => 'Brouillon',
        'issued' => 'Émise',
        'partial' => 'Partiel',
        'paid' => 'Payée',
        'cancelled' => 'Annulée',
    ];

    public function __construct(
        private ExportService $export,
        private TeacherScopeService $teacherScope
    ) {}

    // ── a. Students ────────────────────────────────────────────────────────────

    public function students(Request $request): Response
    {
        $schoolYearId = $this->activeSchoolYearId();
        $classId = $request->integer('class_id') ?: null;
        $levelId = $request->integer('level_id') ?: null;
        $search = trim((string) $request->input('search', ''));

        $query = Student::query()->where('status', '!=', 'archived');

        if ($search !== '') {
            $s = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(student_code) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(first_name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$s]);
            });
        }

        if ($classId || $levelId || $schoolYearId) {
            $query->where(function ($outer) use ($classId, $levelId, $schoolYearId) {
                $outer->whereHas('enrollments', function ($q) use ($classId, $levelId, $schoolYearId) {
                    if ($schoolYearId) {
                        $q->where('school_year_id', $schoolYearId);
                    }
                    if ($classId) {
                        $q->where('class_id', $classId);
                    }
                    if ($levelId) {
                        $q->whereHas('schoolClass', fn ($c) => $c->where('level_id', $levelId));
                    }
                    $q->whereIn('academic_status', ['enrolled', 're_enrolled', 'transferred_in']);
                });
            });
        }

        $this->assertWithinLimit((clone $query)->count());

        $students = $query
            ->with(['guardians', 'enrollments' => function ($q) use ($schoolYearId) {
                if ($schoolYearId) {
                    $q->where('school_year_id', $schoolYearId);
                }
                $q->whereIn('academic_status', ['enrolled', 're_enrolled', 'transferred_in'])
                    ->with(['schoolClass.level'])
                    ->orderByDesc('school_year_id');
            }])
            ->orderBy('last_name')->orderBy('first_name')
            ->limit(self::MAX_ROWS)
            ->get();

        $rows = $students->map(function (Student $st) {
            $enr = $st->enrollments->first();
            $class = $enr?->schoolClass;
            $guardian = $st->guardians->first();

            return [
                'code' => $st->student_code,
                'last_name' => $st->last_name,
                'first_name' => $st->first_name,
                'dob' => $st->date_of_birth,
                'gender' => $this->genderLabel($st->gender),
                'class' => $class?->name,
                'level' => $class?->level?->name,
                'guardian' => $guardian ? trim($guardian->first_name.' '.$guardian->last_name) : null,
                'guardian_phone' => $guardian?->phone,
            ];
        })->all();

        return $this->export->download($rows, [
            ['key' => 'code', 'label' => 'Matricule', 'type' => 'string'],
            ['key' => 'last_name', 'label' => 'Nom', 'type' => 'string'],
            ['key' => 'first_name', 'label' => 'Prénom', 'type' => 'string'],
            ['key' => 'dob', 'label' => 'Date de naissance', 'type' => 'date'],
            ['key' => 'gender', 'label' => 'Sexe', 'type' => 'string'],
            ['key' => 'class', 'label' => 'Classe', 'type' => 'string'],
            ['key' => 'level', 'label' => 'Niveau', 'type' => 'string'],
            ['key' => 'guardian', 'label' => 'Responsable', 'type' => 'string'],
            ['key' => 'guardian_phone', 'label' => 'Téléphone responsable', 'type' => 'string'],
        ], 'Liste des élèves', $this->format($request), $this->filename('eleves', $request));
    }

    // ── b. Teachers ────────────────────────────────────────────────────────────

    public function teachers(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));

        $query = Teacher::query();
        if ($search !== '') {
            $s = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(employee_code) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(first_name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$s]);
            });
        }

        $this->assertWithinLimit((clone $query)->count());

        $teachers = $query->orderBy('last_name')->orderBy('first_name')->limit(self::MAX_ROWS)->get();

        $classMap = $this->teacherClassMap($teachers->pluck('id')->all());

        $rows = $teachers->map(fn (Teacher $t) => [
            'last_name' => $t->last_name,
            'first_name' => $t->first_name,
            'email' => $t->email,
            'phone' => $t->phone,
            'specialization' => $t->specialization,
            'classes' => $classMap[$t->id] ?? null,
            'status' => $this->teacherStatusLabel($t->status),
        ])->all();

        return $this->export->download($rows, [
            ['key' => 'last_name', 'label' => 'Nom', 'type' => 'string'],
            ['key' => 'first_name', 'label' => 'Prénom', 'type' => 'string'],
            ['key' => 'email', 'label' => 'Email', 'type' => 'string'],
            ['key' => 'phone', 'label' => 'Téléphone', 'type' => 'string'],
            ['key' => 'specialization', 'label' => 'Spécialité', 'type' => 'string'],
            ['key' => 'classes', 'label' => 'Classes assignées', 'type' => 'string'],
            ['key' => 'status', 'label' => 'Statut', 'type' => 'string'],
        ], 'Liste des enseignants', $this->format($request), $this->filename('enseignants', $request));
    }

    // ── c. Attendance ──────────────────────────────────────────────────────────

    public function attendance(Request $request): Response
    {
        $from = $request->input('date_from') ?: now()->startOfMonth()->toDateString();
        $to = $request->input('date_to') ?: now()->endOfMonth()->toDateString();
        $classId = $request->integer('class_id') ?: null;
        $status = $request->input('status') ?: null;

        $query = AttendanceRecord::query()
            ->whereDate('attendance_date', '>=', $from)
            ->whereDate('attendance_date', '<=', $to);

        if ($classId) {
            $query->where('class_id', $classId);
        }
        if ($status && in_array($status, ['present', 'absent', 'late'], true)) {
            $query->where('attendance_status', $status);
        }

        $this->teacherScope->restrictAttendanceQuery($request->user(), $query);

        $this->assertWithinLimit((clone $query)->count());

        $records = $query
            ->with(['student:id,first_name,last_name'])
            ->orderByDesc('attendance_date')
            ->limit(self::MAX_ROWS)
            ->get();

        $classMap = $this->classNameMap($records->pluck('class_id')->all());

        $rows = $records->map(fn (AttendanceRecord $a) => [
            'date' => $a->attendance_date,
            'student' => $a->student ? trim($a->student->last_name.' '.$a->student->first_name) : '#'.$a->student_id,
            'class' => $classMap[(int) $a->class_id] ?? null,
            'status' => $this->attendanceStatusLabel($a->attendance_status),
            'justified' => $a->attendance_status === 'present' ? '' : ($a->is_justified ? 'Oui' : 'Non'),
            'remarks' => $a->remarks,
        ])->all();

        return $this->export->download($rows, [
            ['key' => 'date', 'label' => 'Date', 'type' => 'date'],
            ['key' => 'student', 'label' => 'Élève', 'type' => 'string'],
            ['key' => 'class', 'label' => 'Classe', 'type' => 'string'],
            ['key' => 'status', 'label' => 'Statut', 'type' => 'string'],
            ['key' => 'justified', 'label' => 'Justifié', 'type' => 'string'],
            ['key' => 'remarks', 'label' => 'Observation', 'type' => 'string'],
        ], 'Assiduité', $this->format($request), $this->filename('assiduite', $request));
    }

    // ── d. Payments ────────────────────────────────────────────────────────────

    public function payments(Request $request): Response
    {
        $from = $request->input('date_from') ?: null;
        $to = $request->input('date_to') ?: null;
        $studentId = $request->integer('student_id') ?: null;
        $classId = $request->integer('class_id') ?: null;
        $schoolYearId = $this->activeSchoolYearId();

        $query = Payment::query();
        if ($from) {
            $query->whereDate('payment_date', '>=', $from);
        }
        if ($to) {
            $query->whereDate('payment_date', '<=', $to);
        }
        if ($studentId) {
            $query->where('student_id', $studentId);
        }
        if ($classId) {
            $query->whereIn('student_id', $this->studentIdsInClass($classId, $schoolYearId));
        }

        $this->assertWithinLimit((clone $query)->count());

        $payments = $query
            ->with(['student:id,first_name,last_name'])
            ->orderByDesc('payment_date')
            ->limit(self::MAX_ROWS)
            ->get();

        $classMap = $this->studentClassMap($payments->pluck('student_id')->all(), $schoolYearId);
        $cashierMap = $this->userNameMap($payments->pluck('received_by')->all());

        $rows = $payments->map(fn (Payment $p) => [
            'date' => $p->payment_date,
            'receipt' => $p->payment_reference,
            'student' => $p->student ? trim($p->student->last_name.' '.$p->student->first_name) : '#'.$p->student_id,
            'class' => $classMap[(int) $p->student_id] ?? null,
            'amount' => (float) $p->amount,
            'method' => self::PAYMENT_METHODS[$p->payment_method] ?? $p->payment_method,
            'cashier' => $p->received_by ? ($cashierMap[(int) $p->received_by] ?? null) : null,
        ])->all();

        return $this->export->download($rows, [
            ['key' => 'date', 'label' => 'Date', 'type' => 'date'],
            ['key' => 'receipt', 'label' => 'N° Reçu', 'type' => 'string'],
            ['key' => 'student', 'label' => 'Élève', 'type' => 'string'],
            ['key' => 'class', 'label' => 'Classe', 'type' => 'string'],
            ['key' => 'amount', 'label' => 'Montant', 'type' => 'currency'],
            ['key' => 'method', 'label' => 'Mode de paiement', 'type' => 'string'],
            ['key' => 'cashier', 'label' => 'Caissier', 'type' => 'string'],
        ], 'Paiements', $this->format($request), $this->filename('paiements', $request));
    }

    // ── e. Invoices ────────────────────────────────────────────────────────────

    public function invoices(Request $request): Response
    {
        $status = $request->input('status') ?: null;
        $classId = $request->integer('class_id') ?: null;
        $schoolYearId = $this->activeSchoolYearId();

        $query = Invoice::query();

        switch ($status) {
            case 'paid':
                $query->where('status', 'paid');
                break;
            case 'partial':
                $query->where('status', 'partial');
                break;
            case 'unpaid':
                $query->where('status', 'issued')->where('amount_due', '>', 0);
                break;
            case 'overdue':
                $query->whereIn('status', ['issued', 'partial'])
                    ->where('amount_due', '>', 0)
                    ->whereNotNull('due_date')
                    ->whereDate('due_date', '<', now()->toDateString());
                break;
        }

        if ($classId) {
            $query->whereIn('student_id', $this->studentIdsInClass($classId, $schoolYearId));
        }

        $this->assertWithinLimit((clone $query)->count());

        $invoices = $query
            ->with(['student:id,first_name,last_name'])
            ->orderByDesc('issue_date')
            ->limit(self::MAX_ROWS)
            ->get();

        $classMap = $this->studentClassMap($invoices->pluck('student_id')->all(), $schoolYearId);

        $rows = $invoices->map(fn (Invoice $inv) => [
            'number' => $inv->invoice_number,
            'student' => $inv->student ? trim($inv->student->last_name.' '.$inv->student->first_name) : '#'.$inv->student_id,
            'class' => $classMap[(int) $inv->student_id] ?? null,
            'total' => (float) $inv->total_amount,
            'paid' => (float) $inv->amount_paid,
            'due' => (float) $inv->amount_due,
            'status' => $this->invoiceStatusLabel($inv),
            'due_date' => $inv->due_date,
        ])->all();

        return $this->export->download($rows, [
            ['key' => 'number', 'label' => 'N° Facture', 'type' => 'string'],
            ['key' => 'student', 'label' => 'Élève', 'type' => 'string'],
            ['key' => 'class', 'label' => 'Classe', 'type' => 'string'],
            ['key' => 'total', 'label' => 'Montant total', 'type' => 'currency'],
            ['key' => 'paid', 'label' => 'Montant payé', 'type' => 'currency'],
            ['key' => 'due', 'label' => 'Reste', 'type' => 'currency'],
            ['key' => 'status', 'label' => 'Statut', 'type' => 'string'],
            ['key' => 'due_date', 'label' => 'Échéance', 'type' => 'date'],
        ], 'Factures', $this->format($request), $this->filename('factures', $request));
    }

    // ── f. Expenses ────────────────────────────────────────────────────────────

    public function expenses(Request $request): Response
    {
        $from = $request->input('date_from') ?: null;
        $to = $request->input('date_to') ?: null;
        $categoryId = $request->integer('category_id') ?: null;

        $query = Expense::query();
        if ($from) {
            $query->whereDate('expense_date', '>=', $from);
        }
        if ($to) {
            $query->whereDate('expense_date', '<=', $to);
        }
        if ($categoryId) {
            $query->where('expense_category_id', $categoryId);
        }

        $this->assertWithinLimit((clone $query)->count());

        $expenses = $query
            ->with(['category:id,name'])
            ->orderByDesc('expense_date')
            ->limit(self::MAX_ROWS)
            ->get();

        $userMap = $this->userNameMap($expenses->pluck('created_by')->all());

        $rows = $expenses->map(fn (Expense $e) => [
            'date' => $e->expense_date,
            'category' => $e->category?->name,
            'description' => $e->description,
            'amount' => (float) $e->amount,
            'created_by' => $e->created_by ? ($userMap[(int) $e->created_by] ?? null) : null,
        ])->all();

        return $this->export->download($rows, [
            ['key' => 'date', 'label' => 'Date', 'type' => 'date'],
            ['key' => 'category', 'label' => 'Catégorie', 'type' => 'string'],
            ['key' => 'description', 'label' => 'Description', 'type' => 'string'],
            ['key' => 'amount', 'label' => 'Montant', 'type' => 'currency'],
            ['key' => 'created_by', 'label' => 'Enregistré par', 'type' => 'string'],
        ], 'Dépenses', $this->format($request), $this->filename('depenses', $request));
    }

    // ── g. Grades ──────────────────────────────────────────────────────────────

    public function grades(Request $request): Response
    {
        $classId = $request->integer('class_id') ?: null;
        $subjectId = $request->integer('subject_id') ?: null;
        $periodId = $request->integer('evaluation_period_id') ?: null;

        $query = Grade::query();
        if ($classId) {
            $query->where('class_id', $classId);
        }
        if ($subjectId) {
            $query->where('subject_id', $subjectId);
        }
        if ($periodId) {
            $query->where('evaluation_period_id', $periodId);
        }

        $this->teacherScope->restrictGradesQuery($request->user(), $query);

        $this->assertWithinLimit((clone $query)->count());

        $grades = $query
            ->with(['student:id,first_name,last_name', 'subject:id,name'])
            ->orderByDesc('created_at')
            ->limit(self::MAX_ROWS)
            ->get();

        $classMap = $this->classNameMap($grades->pluck('class_id')->all());
        $periodMap = $this->periodNameMap($grades->pluck('evaluation_period_id')->all());

        $rows = $grades->map(fn (Grade $g) => [
            'student' => $g->student ? trim($g->student->last_name.' '.$g->student->first_name) : '#'.$g->student_id,
            'class' => $classMap[(int) $g->class_id] ?? null,
            'subject' => $g->subject?->name,
            'period' => $periodMap[(int) $g->evaluation_period_id] ?? null,
            'score' => $g->score !== null ? (float) $g->score : null,
            'coefficient' => $g->coefficient !== null ? (float) $g->coefficient : null,
            'appreciation' => $g->appreciation,
        ])->all();

        return $this->export->download($rows, [
            ['key' => 'student', 'label' => 'Élève', 'type' => 'string'],
            ['key' => 'class', 'label' => 'Classe', 'type' => 'string'],
            ['key' => 'subject', 'label' => 'Matière', 'type' => 'string'],
            ['key' => 'period', 'label' => "Période d'évaluation", 'type' => 'string'],
            ['key' => 'score', 'label' => 'Note', 'type' => 'number'],
            ['key' => 'coefficient', 'label' => 'Coefficient', 'type' => 'number'],
            ['key' => 'appreciation', 'label' => 'Observation', 'type' => 'string'],
        ], 'Notes', $this->format($request), $this->filename('notes', $request));
    }

    // ── h. Users ───────────────────────────────────────────────────────────────

    public function users(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $roleId = $request->integer('role') ?: ($request->integer('role_id') ?: null);

        $query = User::query()->with('role');
        if ($search !== '') {
            $s = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(email) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(first_name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$s]);
            });
        }
        if ($roleId) {
            $query->where('role_id', $roleId);
        }

        $this->assertWithinLimit((clone $query)->count());

        $users = $query->orderBy('last_name')->orderBy('first_name')->limit(self::MAX_ROWS)->get();

        $rows = $users->map(fn (User $u) => [
            'last_name' => $u->last_name,
            'first_name' => $u->first_name,
            'email' => $u->email,
            'role' => $u->role?->name,
            'status' => $this->userStatusLabel($u->status),
            'last_login' => $u->last_login_at,
        ])->all();

        return $this->export->download($rows, [
            ['key' => 'last_name', 'label' => 'Nom', 'type' => 'string'],
            ['key' => 'first_name', 'label' => 'Prénom', 'type' => 'string'],
            ['key' => 'email', 'label' => 'Email', 'type' => 'string'],
            ['key' => 'role', 'label' => 'Rôle', 'type' => 'string'],
            ['key' => 'status', 'label' => 'Statut', 'type' => 'string'],
            ['key' => 'last_login', 'label' => 'Dernière connexion', 'type' => 'datetime'],
        ], 'Utilisateurs', $this->format($request), $this->filename('utilisateurs', $request));
    }

    // ── i. Audit logs ──────────────────────────────────────────────────────────

    public function auditLogs(Request $request): Response
    {
        $from = $request->input('date_from') ?: null;
        $to = $request->input('date_to') ?: null;
        $userId = $request->integer('user_id') ?: null;
        $action = trim((string) $request->input('action', ''));

        $query = AuditLog::query();
        if ($from) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to) {
            $query->whereDate('created_at', '<=', $to);
        }
        if ($userId) {
            $query->where('user_id', $userId);
        }
        if ($action !== '') {
            $query->where('action', 'like', '%'.$action.'%');
        }

        $this->assertWithinLimit((clone $query)->count());

        $logs = $query
            ->with(['user:id,first_name,last_name,email'])
            ->orderByDesc('id')
            ->limit(self::MAX_ROWS)
            ->get();

        $rows = $logs->map(fn (AuditLog $l) => [
            'datetime' => $l->created_at,
            'user' => $l->user ? trim($l->user->first_name.' '.$l->user->last_name) : '—',
            'action' => $l->action,
            'detail' => $this->auditDetail($l),
            'ip' => $l->ip_address,
        ])->all();

        return $this->export->download($rows, [
            ['key' => 'datetime', 'label' => 'Date/Heure', 'type' => 'datetime'],
            ['key' => 'user', 'label' => 'Utilisateur', 'type' => 'string'],
            ['key' => 'action', 'label' => 'Action', 'type' => 'string'],
            ['key' => 'detail', 'label' => 'Détail', 'type' => 'string'],
            ['key' => 'ip', 'label' => 'Adresse IP', 'type' => 'string'],
        ], "Journal d'audit", $this->format($request), $this->filename('audit', $request));
    }

    // ── Shared helpers ─────────────────────────────────────────────────────────

    private function format(Request $request): string
    {
        $fmt = strtolower((string) $request->input('format', 'xlsx'));

        return $fmt === 'pdf' ? 'pdf' : 'xlsx';
    }

    private function filename(string $type, Request $request): string
    {
        $ext = $this->format($request) === 'pdf' ? 'pdf' : 'xlsx';

        return $type.'_'.now()->format('Y-m-d').'.'.$ext;
    }

    private function assertWithinLimit(int $count): void
    {
        if ($count > self::MAX_ROWS) {
            abort(413, 'Trop de données. Veuillez affiner vos filtres.');
        }
    }

    private function activeSchoolYearId(): ?int
    {
        $id = SchoolYear::query()->where('is_current', true)->value('id');

        return $id !== null ? (int) $id : null;
    }

    /**
     * @param  array<int, int|null>  $studentIds
     * @return array<int, string> student_id => class name
     */
    private function studentClassMap(array $studentIds, ?int $schoolYearId): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $studentIds))));
        if ($ids === []) {
            return [];
        }

        $q = Enrollment::query()
            ->whereIn('student_id', $ids)
            ->whereIn('academic_status', ['enrolled', 're_enrolled', 'transferred_in'])
            ->with('schoolClass:id,name')
            ->orderByDesc('school_year_id');

        $map = [];
        foreach ($q->get() as $enr) {
            $sid = (int) $enr->student_id;
            // Prefer the active-year enrollment; otherwise keep the most recent.
            if (isset($map[$sid]) && $schoolYearId !== null && (int) $enr->school_year_id !== $schoolYearId) {
                continue;
            }
            if (! isset($map[$sid]) || ($schoolYearId !== null && (int) $enr->school_year_id === $schoolYearId)) {
                $map[$sid] = $enr->schoolClass?->name ?? '';
            }
        }

        return $map;
    }

    /**
     * @return list<int> student ids enrolled in the given class (active statuses)
     */
    private function studentIdsInClass(int $classId, ?int $schoolYearId): array
    {
        $q = Enrollment::query()
            ->where('class_id', $classId)
            ->whereIn('academic_status', ['enrolled', 're_enrolled', 'transferred_in']);
        if ($schoolYearId !== null) {
            $q->where('school_year_id', $schoolYearId);
        }

        return $q->pluck('student_id')->map(fn ($v) => (int) $v)->unique()->values()->all();
    }

    /**
     * @param  array<int, int|null>  $classIds
     * @return array<int, string>
     */
    private function classNameMap(array $classIds): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $classIds))));
        if ($ids === []) {
            return [];
        }

        return SchoolClass::query()->whereIn('id', $ids)->pluck('name', 'id')
            ->mapWithKeys(fn ($name, $id) => [(int) $id => (string) $name])->all();
    }

    /**
     * @param  array<int, int|null>  $periodIds
     * @return array<int, string>
     */
    private function periodNameMap(array $periodIds): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $periodIds))));
        if ($ids === []) {
            return [];
        }

        return EvaluationPeriod::query()->whereIn('id', $ids)->pluck('name', 'id')
            ->mapWithKeys(fn ($name, $id) => [(int) $id => (string) $name])->all();
    }

    /**
     * @param  array<int, int|null>  $userIds
     * @return array<int, string>
     */
    private function userNameMap(array $userIds): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $userIds))));
        if ($ids === []) {
            return [];
        }

        return User::query()->whereIn('id', $ids)->get(['id', 'first_name', 'last_name'])
            ->mapWithKeys(fn (User $u) => [(int) $u->id => trim($u->first_name.' '.$u->last_name)])->all();
    }

    /**
     * @param  array<int, int|null>  $teacherIds
     * @return array<int, string> teacher_id => comma-separated class names
     */
    private function teacherClassMap(array $teacherIds): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $teacherIds))));
        if ($ids === []) {
            return [];
        }

        $rows = TeacherClassSubject::query()
            ->whereIn('teacher_id', $ids)
            ->where(fn ($q) => $q->whereNull('status')->orWhere('status', '!=', 'inactive'))
            ->with('schoolClass:id,name')
            ->get();

        $map = [];
        foreach ($rows as $tcs) {
            $name = $tcs->schoolClass?->name;
            if (! $name) {
                continue;
            }
            $map[(int) $tcs->teacher_id][$name] = true;
        }

        // Also include classes where the teacher is the main teacher.
        SchoolClass::query()->whereIn('main_teacher_id', $ids)->get(['id', 'name', 'main_teacher_id'])
            ->each(function (SchoolClass $c) use (&$map) {
                if ($c->name) {
                    $map[(int) $c->main_teacher_id][$c->name] = true;
                }
            });

        return array_map(fn ($set) => implode(', ', array_keys($set)), $map);
    }

    private function auditDetail(AuditLog $l): string
    {
        $parts = [];
        if ($l->subject_type) {
            $parts[] = class_basename($l->subject_type).($l->subject_id ? ' #'.$l->subject_id : '');
        }

        return implode(' ', $parts);
    }

    private function genderLabel(?string $g): string
    {
        return match (strtolower((string) $g)) {
            'm', 'male', 'masculin' => 'Masculin',
            'f', 'female', 'féminin', 'feminin' => 'Féminin',
            default => (string) $g,
        };
    }

    private function attendanceStatusLabel(?string $s): string
    {
        return match ($s) {
            'present' => 'Présent',
            'absent' => 'Absent',
            'late' => 'Retard',
            default => (string) $s,
        };
    }

    private function teacherStatusLabel(?string $s): string
    {
        return match ($s) {
            'active' => 'Actif',
            'inactive' => 'Inactif',
            'on_leave' => 'En congé',
            'suspended' => 'Suspendu',
            default => (string) $s,
        };
    }

    private function userStatusLabel(?string $s): string
    {
        return match ($s) {
            'active' => 'Actif',
            'inactive' => 'Inactif',
            'suspended' => 'Suspendu',
            default => (string) $s,
        };
    }

    private function invoiceStatusLabel(Invoice $inv): string
    {
        $isOverdue = in_array($inv->status, ['issued', 'partial'], true)
            && (float) $inv->amount_due > 0
            && $inv->due_date !== null
            && $inv->due_date->isPast();

        if ($isOverdue) {
            return 'En retard';
        }

        return self::INVOICE_STATUS[$inv->status] ?? (string) $inv->status;
    }
}
