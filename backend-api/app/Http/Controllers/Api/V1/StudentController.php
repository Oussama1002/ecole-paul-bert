<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Students\ImportStudentsRequest;
use App\Http\Requests\Api\V1\Students\IndexStudentRequest;
use App\Http\Requests\Api\V1\Students\StoreStudentRequest;
use App\Http\Requests\Api\V1\Students\UpdateStudentRequest;
use App\Http\Resources\EnrollmentResource;
use App\Http\Resources\StudentResource;
use App\Http\Responses\ApiResponse;
use App\Models\AttendanceRecord;
use App\Models\Document;
use App\Models\FeeAssignment;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Services\AuditLogger;
use App\Services\StudentImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentController extends Controller
{
    public function __construct(
        private AuditLogger $audit
    ) {}
    public function index(IndexStudentRequest $request): JsonResponse
    {
        $query = Student::query();

        if ($search = $request->validated('search')) {
            $s = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(student_code) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(first_name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$s]);
            });
        }

        if ($status = $request->validated('status')) {
            $query->where('status', $status);
        } else {
            // Archived students are hidden by default — visible only when explicitly filtered
            $query->where('status', '!=', 'archived');
        }

        $schoolYearId = $request->validated('school_year_id');
        $classId = $request->validated('class_id');
        $levelId = $request->validated('level_id');

        $this->applyListEnrollmentFilter($query, $schoolYearId, $classId, $levelId);

        $query->orderBy($request->validated('sort_by'), $request->validated('sort_order'));

        $paginator = $query
            ->with([
                'enrollments' => function ($q) use ($schoolYearId) {
                    if ($schoolYearId) {
                        $q->where('school_year_id', $schoolYearId);
                    }
                    $q->with(['schoolClass.level', 'schoolYear']);
                },
            ])
            ->paginate((int) $request->validated('per_page'))
            ->withQueryString();

        return ApiResponse::success([
            'items' => StudentResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Élèves.');
    }

    public function show(Student $student): JsonResponse
    {
        $student->load([
            'guardians',
            'enrollments.schoolYear',
            'enrollments.schoolClass.level',
        ]);

        return ApiResponse::success(
            (new StudentResource($student))->resolve(),
            'Élève.'
        );
    }

    public function store(StoreStudentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $schoolYearId = isset($data['school_year_id']) ? (int) $data['school_year_id'] : null;
        $classId = isset($data['class_id']) ? (int) $data['class_id'] : null;
        unset($data['school_year_id'], $data['class_id']);

        $student = DB::transaction(function () use ($request, $data, $schoolYearId, $classId) {
            if ($schoolYearId && $classId) {
                $data['status'] = 'active';
            }

            $student = Student::query()->create($data);

            if ($schoolYearId && $classId) {
                $class = SchoolClass::query()->findOrFail($classId);
                if ((int) $class->school_year_id !== $schoolYearId) {
                    throw ValidationException::withMessages([
                        'class_id' => ['La classe sélectionnée n’appartient pas à cette année scolaire.'],
                    ]);
                }

                $enrollment = Enrollment::query()->create([
                    'student_id' => $student->id,
                    'school_year_id' => $schoolYearId,
                    'class_id' => $classId,
                    'enrollment_number' => $this->nextEnrollmentNumber(),
                    'enrollment_date' => now()->toDateString(),
                    'academic_status' => 'enrolled',
                    'admission_type' => 'new',
                    'registration_status' => 'validated',
                    'created_by' => $request->user()?->id,
                ]);

                $this->audit->log(
                    $request->user(),
                    'enrollment.created',
                    $enrollment,
                    null,
                    [
                        'student_id' => $student->id,
                        'school_year_id' => $schoolYearId,
                        'class_id' => $classId,
                    ],
                    $request
                );
            }

            return $student;
        });

        $this->audit->log(
            $request->user(),
            'student.created',
            $student,
            null,
            $student->only(['student_code', 'first_name', 'last_name', 'status', 'date_of_birth']),
            $request
        );

        $student->load([
            'enrollments.schoolClass.level',
            'enrollments.schoolYear',
        ]);

        return ApiResponse::success(
            (new StudentResource($student))->resolve(),
            'Élève créé.',
            201
        );
    }

    private function nextEnrollmentNumber(): string
    {
        $year = (int) date('Y');
        $prefix = 'INS-'.$year.'-';

        $last = Enrollment::query()
            ->where('enrollment_number', 'like', $prefix.'%')
            ->orderByDesc('enrollment_number')
            ->value('enrollment_number');

        $next = 1;
        if (is_string($last) && preg_match('/-(\d+)$/', $last, $m)) {
            $next = (int) $m[1] + 1;
        }

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Simple-mode helper: suggest the next registration number for a new student.
     * Format: EPB-{YYYY}-{0001}. Looks at the current calendar year's codes and
     * bumps the highest trailing integer. The advanced flow can still override
     * this value — it is only a default suggestion.
     */
    public function nextCode(): JsonResponse
    {
        $year = (int) date('Y');
        $prefix = 'EPB-'.$year.'-';

        $last = Student::withTrashed()
            ->where('student_code', 'like', $prefix.'%')
            ->orderByDesc('student_code')
            ->value('student_code');

        $next = 1;
        if (is_string($last) && preg_match('/-(\d+)$/', $last, $m)) {
            $next = (int) $m[1] + 1;
        }

        return ApiResponse::success([
            'student_code' => $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT),
        ], 'Prochain code élève.');
    }

    public function update(UpdateStudentRequest $request, Student $student): JsonResponse
    {
        $before = $student->only(['student_code', 'first_name', 'last_name', 'status', 'date_of_birth', 'address']);
        $student->fill($request->validated());
        $student->save();
        $changes = $student->getChanges();
        if ($changes !== []) {
            $action = (array_key_exists('status', $changes) && (string) $changes['status'] === 'withdrawn')
                ? 'student.withdrawn'
                : 'student.updated';
            $this->audit->log(
                $request->user(),
                $action,
                $student,
                array_intersect_key($before, array_flip(array_keys($changes))),
                $changes
            );
        }

        return ApiResponse::success(
            (new StudentResource($student->fresh()))->resolve(),
            'Élève mis à jour.'
        );
    }

    public function destroy(Request $request, Student $student): JsonResponse
    {
        $before = $student->only(['id', 'student_code', 'first_name', 'last_name', 'status']);
        $student->status = 'withdrawn';
        $student->save();
        $student->delete();

        $this->audit->log(
            $request->user(),
            'student.deleted',
            $student,
            $before,
            ['status' => 'withdrawn', 'deleted' => true]
        );

        return ApiResponse::success(null, 'Élève archivé (suppression logique).');
    }

    public function forceDestroy(Request $request, Student $student): JsonResponse
    {
        if ($student->status !== 'archived') {
            return ApiResponse::error(
                "Seuls les élèves archivés peuvent être supprimés définitivement.",
                [],
                422
            );
        }

        $before = $student->only(['id', 'student_code', 'first_name', 'last_name', 'status']);
        $student->forceDelete();

        try {
            $this->audit->log(
                $request->user(),
                'student.force_deleted',
                null,
                $before,
                ['permanently_deleted' => true]
            );
        } catch (\Throwable) {}

        return ApiResponse::success(null, 'Élève supprimé définitivement.');
    }

    public function history(Student $student): JsonResponse
    {
        $enrollments = $student->enrollments()
            ->with(['schoolYear', 'schoolClass.level'])
            ->orderByDesc('enrollment_date')
            ->get();

        $assignments = $student->studentClassAssignments()
            ->with(['schoolYear', 'schoolClass.level'])
            ->orderByDesc('assignment_date')
            ->get();

        $timeline = [];

        foreach ($enrollments as $e) {
            $timeline[] = [
                'type' => 'enrollment',
                'date' => $e->enrollment_date?->format('Y-m-d'),
                'label' => 'Inscription '.$e->enrollment_number,
                'meta' => [
                    'enrollment_id' => $e->id,
                    'academic_status' => $e->academic_status,
                    'registration_status' => $e->registration_status,
                    'class' => $e->schoolClass?->name,
                    'school_year' => $e->schoolYear?->name,
                ],
            ];
        }

        foreach ($assignments as $a) {
            $timeline[] = [
                'type' => 'class_assignment',
                'date' => $a->assignment_date?->format('Y-m-d'),
                'label' => 'Affectation classe',
                'meta' => [
                    'assignment_id' => $a->id,
                    'status' => $a->status,
                    'class' => $a->schoolClass?->name,
                    'school_year' => $a->schoolYear?->name,
                ],
            ];
        }

        usort($timeline, fn ($a, $b) => strcmp((string) ($b['date'] ?? ''), (string) ($a['date'] ?? '')));

        return ApiResponse::success([
            'enrollments' => EnrollmentResource::collection($enrollments)->resolve(),
            'class_assignments' => $assignments->map(fn ($a) => [
                'id' => $a->id,
                'assignment_date' => $a->assignment_date?->format('Y-m-d'),
                'end_date' => $a->end_date?->format('Y-m-d'),
                'status' => $a->status,
                'notes' => $a->notes,
                'school_year' => $a->schoolYear?->name,
                'class' => $a->schoolClass?->name,
            ]),
            'timeline' => $timeline,
        ], 'Historique élève.');
    }

    public function grades(Request $request, Student $student): JsonResponse
    {
        $q = Grade::query()->where('student_id', $student->id)
            ->with('subject:id,name,code')
            ->orderByDesc('created_at');

        if ($request->filled('school_year_id')) {
            $q->where('school_year_id', (int) $request->input('school_year_id'));
        }

        $perPage = min((int) $request->input('per_page', 30), 100);
        $paginator = $q->paginate($perPage);

        return ApiResponse::success([
            'items' => $paginator->getCollection()->map(fn ($g) => [
                'id' => $g->id,
                'score' => (string) $g->score,
                'max_score' => (string) $g->max_score,
                'subject' => $g->subject ? ['id' => $g->subject->id, 'name' => $g->subject->name, 'code' => $g->subject->code] : null,
                'created_at' => $g->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Notes.');
    }

    public function attendance(Request $request, Student $student): JsonResponse
    {
        $q = AttendanceRecord::query()->where('student_id', $student->id)
            ->orderByDesc('attendance_date');

        if ($request->filled('school_year_id')) {
            $q->where('school_year_id', (int) $request->input('school_year_id'));
        }

        $perPage = min((int) $request->input('per_page', 30), 100);
        $paginator = $q->paginate($perPage);

        return ApiResponse::success([
            'items' => $paginator->getCollection()->map(fn ($a) => [
                'id' => $a->id,
                'attendance_date' => $a->attendance_date?->format('Y-m-d'),
                'attendance_status' => $a->attendance_status,
                'is_justified' => (bool) $a->is_justified,
            ]),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Absences.');
    }

    public function documents(Student $student): JsonResponse
    {
        $docs = Document::query()
            ->where('student_id', $student->id)
            ->orderByDesc('created_at')
            ->limit(200)
            ->get(['id', 'document_type', 'title', 'file_name', 'status', 'created_at']);

        return ApiResponse::success(
            $docs->map(fn ($d) => [
                'id' => $d->id,
                'document_type' => $d->document_type,
                'title' => $d->title,
                'file_name' => $d->file_name,
                'status' => $d->status,
                'created_at' => $d->created_at?->toIso8601String(),
            ]),
            'Documents.'
        );
    }

    public function finance(Student $student): JsonResponse
    {
        $fees = FeeAssignment::query()
            ->where('student_id', $student->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $payments = Payment::query()
            ->where('student_id', $student->id)
            ->orderByDesc('payment_date')
            ->limit(100)
            ->get();

        return ApiResponse::success([
            'fee_assignments' => $fees->map(fn ($f) => [
                'id' => $f->id,
                'amount_due' => (string) $f->amount_due,
                'amount_paid' => (string) $f->amount_paid,
                'balance' => (string) $f->balance,
                'status' => $f->status,
            ]),
            'payments' => $payments->map(fn ($p) => [
                'id' => $p->id,
                'amount' => (string) $p->amount,
                'payment_date' => $p->payment_date?->format('Y-m-d'),
                'status' => $p->status,
            ]),
        ], 'Finance.');
    }

    public function export(IndexStudentRequest $request): StreamedResponse
    {
        $query = Student::query();

        if ($search = $request->validated('search')) {
            $s = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(student_code) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(first_name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$s]);
            });
        }
        if ($status = $request->validated('status')) {
            $query->where('status', $status);
        } else {
            // Archived students are hidden by default — visible only when explicitly filtered
            $query->where('status', '!=', 'archived');
        }

        $schoolYearId = $request->validated('school_year_id');
        $classId = $request->validated('class_id');
        $levelId = $request->validated('level_id');

        $this->applyListEnrollmentFilter($query, $schoolYearId, $classId, $levelId);

        $filename = 'eleves_'.date('Y-m-d_His').'.csv';
        $baseQuery = clone $query;

        return response()->streamDownload(function () use ($baseQuery) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($out, ['student_code', 'first_name', 'last_name', 'gender', 'date_of_birth', 'status', 'city'], ';');
            foreach ($baseQuery->orderBy('last_name')->orderBy('first_name')->cursor() as $st) {
                fputcsv($out, [
                    $st->student_code,
                    $st->first_name,
                    $st->last_name,
                    $st->gender,
                    $st->date_of_birth?->format('Y-m-d'),
                    $st->status,
                    $st->city,
                ], ';');
            }
            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function exportExcel(IndexStudentRequest $request): StreamedResponse
    {
        $query = Student::query();

        if ($search = $request->validated('search')) {
            $s = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(student_code) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(first_name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$s]);
            });
        }
        if ($status = $request->validated('status')) {
            $query->where('status', $status);
        } else {
            // Archived students are hidden by default — visible only when explicitly filtered
            $query->where('status', '!=', 'archived');
        }

        $schoolYearId = $request->validated('school_year_id');
        $classId = $request->validated('class_id');
        $levelId = $request->validated('level_id');

        $this->applyListEnrollmentFilter($query, $schoolYearId, $classId, $levelId);

        $baseQuery = clone $query;
        $filename = 'eleves_'.date('Y-m-d_His').'.xlsx';

        return response()->streamDownload(function () use ($baseQuery) {
            $sheet = new Spreadsheet();
            $ws = $sheet->getActiveSheet();
            $ws->fromArray(['Code', 'Prénom', 'Nom', 'Genre', 'Naissance', 'Statut', 'Ville'], null, 'A1');
            $row = 2;
            foreach ($baseQuery->orderBy('last_name')->orderBy('first_name')->limit(8000)->get() as $st) {
                $ws->fromArray([
                    $st->student_code,
                    $st->first_name,
                    $st->last_name,
                    $st->gender,
                    $st->date_of_birth?->format('Y-m-d'),
                    $st->status,
                    $st->city,
                ], null, 'A'.$row);
                $row++;
            }
            (new Xlsx($sheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function import(ImportStudentsRequest $request, StudentImportService $importService): JsonResponse
    {
        $file = $request->file('file');
        $map = $request->input('column_map');

        try {
            $result = $importService->importFromFile($file, is_array($map) ? $map : null);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), [], 422);
        }

        return ApiResponse::success($result, 'Import terminé.');
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<Student>  $query
     */
    private function applyListEnrollmentFilter(
        $query,
        ?int $schoolYearId,
        ?int $classId,
        ?int $levelId
    ): void {
        if (! $classId && ! $levelId && ! $schoolYearId) {
            return;
        }

        $query->where(function ($outer) use ($classId, $levelId, $schoolYearId) {
            $outer->whereDoesntHave('enrollments')
                ->orWhereHas('enrollments', function ($q) use ($classId, $levelId, $schoolYearId) {
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
}
