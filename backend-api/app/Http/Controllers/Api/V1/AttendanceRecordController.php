<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Attendance\BulkMarkAttendanceRequest;
use App\Http\Requests\Api\V1\Attendance\IndexAttendanceRecordRequest;
use App\Http\Requests\Api\V1\Attendance\JustifyAttendanceRequest;
use App\Http\Requests\Api\V1\Attendance\StoreAttendanceRecordRequest;
use App\Http\Requests\Api\V1\Attendance\UpdateAttendanceRecordRequest;
use App\Http\Responses\ApiResponse;
use App\Models\AttendanceJustificationLog;
use App\Models\AttendanceRecord;
use App\Models\Enrollment;
use App\Models\SchoolClass;
use App\Services\AttendanceAlertService;
use App\Services\TeacherScopeService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceRecordController extends Controller
{
    public function __construct(
        private AttendanceAlertService $alertService,
        private TeacherScopeService $teacherScope
    ) {}

    public function index(IndexAttendanceRecordRequest $request): JsonResponse
    {
        $q = AttendanceRecord::query();

        foreach ([
            'school_year_id',
            'class_id',
            'student_id',
            'schedule_entry_id',
        ] as $key) {
            if ($v = $request->validated($key)) {
                $q->where($key, (int) $v);
            }
        }

        if ($status = $request->validated('attendance_status')) {
            $q->where('attendance_status', $status);
        }

        if (($isJustified = $request->validated('is_justified')) !== null) {
            $q->where('is_justified', (bool) $isJustified);
        }

        if ($date = $request->validated('attendance_date')) {
            $q->whereDate('attendance_date', $date);
        }
        if ($from = $request->validated('from')) {
            $q->whereDate('attendance_date', '>=', $from);
        }
        if ($to = $request->validated('to')) {
            $q->whereDate('attendance_date', '<=', $to);
        }

        $this->teacherScope->restrictAttendanceQuery($request->user(), $q);

        $q->orderBy($request->validated('sort_by'), $request->validated('sort_order'));

        $paginator = $q->paginate((int) $request->validated('per_page'))->withQueryString();

        return ApiResponse::success([
            'items' => $paginator->getCollection()->map(fn (AttendanceRecord $a) => $this->toDto($a)),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Absences et retards.');
    }

    public function exportExcel(IndexAttendanceRecordRequest $request): StreamedResponse
    {
        $q = AttendanceRecord::query()->with(['student:id,first_name,last_name,student_code']);

        foreach ([
            'school_year_id',
            'class_id',
            'student_id',
            'schedule_entry_id',
        ] as $key) {
            if ($v = $request->validated($key)) {
                $q->where($key, (int) $v);
            }
        }

        if ($status = $request->validated('attendance_status')) {
            $q->where('attendance_status', $status);
        }

        if (($isJustified = $request->validated('is_justified')) !== null) {
            $q->where('is_justified', (bool) $isJustified);
        }

        if ($date = $request->validated('attendance_date')) {
            $q->whereDate('attendance_date', $date);
        }
        if ($from = $request->validated('from')) {
            $q->whereDate('attendance_date', '>=', $from);
        }
        if ($to = $request->validated('to')) {
            $q->whereDate('attendance_date', '<=', $to);
        }

        $this->teacherScope->restrictAttendanceQuery($request->user(), $q);

        $q->orderBy($request->validated('sort_by'), $request->validated('sort_order'));

        $items = $q->limit(8000)->get();
        $filename = 'absences_'.date('Y-m-d_His').'.xlsx';

        return response()->streamDownload(function () use ($items) {
            $sheet = new Spreadsheet();
            $ws = $sheet->getActiveSheet();
            $ws->fromArray([
                'id', 'date', 'classe_id', 'eleve_code', 'eleve', 'statut', 'retard_min', 'justifie', 'remarques',
            ], null, 'A1');
            $row = 2;
            foreach ($items as $a) {
                $stu = $a->student;
                $ws->fromArray([
                    $a->id,
                    $a->attendance_date?->format('Y-m-d'),
                    $a->class_id,
                    $stu?->student_code,
                    trim(($stu?->last_name ?? '').' '.($stu?->first_name ?? '')),
                    $a->attendance_status,
                    $a->minutes_late,
                    $a->is_justified ? 'oui' : 'non',
                    $a->remarks,
                ], null, 'A'.$row);
                $row++;
            }
            (new Xlsx($sheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function store(StoreAttendanceRecordRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['marked_by'] = $request->user()?->id;

        $this->teacherScope->assertAttendanceWriteScope(
            $request->user(),
            (int) $data['school_year_id'],
            (int) $data['class_id'],
            isset($data['subject_id']) ? (int) $data['subject_id'] : null,
            isset($data['schedule_entry_id']) ? (int) $data['schedule_entry_id'] : null
        );

        if ($this->teacherScope->isStrictTeacher($request->user())) {
            $data['teacher_id'] = $this->teacherScope->resolveTeacherId($request->user());
        }

        $dup = $this->detectDuplicate($data);
        if ($dup) {
            return ApiResponse::error('Doublon : un enregistrement existe déjà pour cette séance/date.', [
                'duplicate' => ['Un enregistrement existe déjà pour cette séance/date.'],
            ], 422);
        }

        try {
            $record = AttendanceRecord::query()->create($this->normalize($data));
        } catch (QueryException $e) {
            return ApiResponse::error('Impossible de créer (doublon ou données invalides).', [], 422);
        }

        $this->alertService->handleAfterSave($record);

        return ApiResponse::success($this->toDto($record), 'Présence enregistrée.', 201);
    }

    public function show(Request $request, AttendanceRecord $attendanceRecord): JsonResponse
    {
        $this->assertAttendanceRecordVisible($request, $attendanceRecord);

        return ApiResponse::success($this->toDto($attendanceRecord), 'Présence.');
    }

    public function update(UpdateAttendanceRecordRequest $request, AttendanceRecord $attendanceRecord): JsonResponse
    {
        $this->assertAttendanceRecordVisible($request, $attendanceRecord);

        $this->teacherScope->assertAttendanceWriteScope(
            $request->user(),
            (int) $attendanceRecord->school_year_id,
            (int) $attendanceRecord->class_id,
            $attendanceRecord->subject_id ? (int) $attendanceRecord->subject_id : null,
            $attendanceRecord->schedule_entry_id ? (int) $attendanceRecord->schedule_entry_id : null
        );

        $attendanceRecord->fill($this->normalize($request->validated()));
        $attendanceRecord->save();

        $this->alertService->handleAfterSave($attendanceRecord);

        return ApiResponse::success($this->toDto($attendanceRecord->fresh()), 'Présence mise à jour.');
    }

    public function destroy(Request $request, AttendanceRecord $attendanceRecord): JsonResponse
    {
        $this->assertAttendanceRecordVisible($request, $attendanceRecord);

        $attendanceRecord->delete();

        return ApiResponse::success(null, 'Présence supprimée.');
    }

    public function bulkMark(SchoolClass $schoolClass, BulkMarkAttendanceRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $markedBy = $request->user()?->id;

        $schoolYearId = (int) $payload['school_year_id'];
        $date = (string) $payload['attendance_date'];
        $termId = isset($payload['term_id']) ? (int) $payload['term_id'] : null;
        $scheduleEntryId = isset($payload['schedule_entry_id']) ? (int) $payload['schedule_entry_id'] : null;
        $subjectId = isset($payload['subject_id']) ? (int) $payload['subject_id'] : null;
        $teacherId = isset($payload['teacher_id']) ? (int) $payload['teacher_id'] : null;

        $this->teacherScope->assertAttendanceWriteScope(
            $request->user(),
            $schoolYearId,
            (int) $schoolClass->id,
            $subjectId,
            $scheduleEntryId
        );
        if ($this->teacherScope->isStrictTeacher($request->user())) {
            $teacherId = $this->teacherScope->resolveTeacherId($request->user());
        }

        $activeStudentIds = Enrollment::query()
            ->where('school_year_id', $schoolYearId)
            ->where('class_id', $schoolClass->id)
            ->whereIn('academic_status', ['enrolled', 're_enrolled', 'transferred_in'])
            ->pluck('student_id')
            ->values()
            ->all();

        $items = $payload['items'];
        foreach ($items as $row) {
            if (! in_array((int) $row['student_id'], $activeStudentIds, true)) {
                return ApiResponse::error("Élève {$row['student_id']} non inscrit dans cette classe/année.", [], 422);
            }
        }

        $saved = [];
        DB::beginTransaction();
        try {
            foreach ($items as $row) {
                $data = $this->normalize([
                    'school_year_id' => $schoolYearId,
                    'term_id' => $termId,
                    'class_id' => $schoolClass->id,
                    'student_id' => (int) $row['student_id'],
                    'subject_id' => $subjectId,
                    'teacher_id' => $teacherId,
                    'schedule_entry_id' => $scheduleEntryId,
                    'attendance_date' => $date,
                    'attendance_status' => $row['attendance_status'],
                    'minutes_late' => $row['minutes_late'] ?? null,
                    'remarks' => $row['remarks'] ?? null,
                    'marked_by' => $markedBy,
                ]);

                $record = $this->upsertBulk($data);
                $saved[] = $record;
            }
            DB::commit();
        } catch (QueryException $e) {
            DB::rollBack();
            return ApiResponse::error('Doublon détecté sur une séance : enregistrement déjà existant.', [], 422);
        } catch (\Throwable $e) {
            DB::rollBack();
            return ApiResponse::error('Erreur saisie en masse.', [], 500);
        }

        foreach ($saved as $r) {
            $this->alertService->handleAfterSave($r);
        }

        return ApiResponse::success([
            'items' => array_map(fn (AttendanceRecord $a) => $this->toDto($a), $saved),
        ], 'Saisie en masse enregistrée.');
    }

    public function justify(AttendanceRecord $attendanceRecord, JustifyAttendanceRequest $request): JsonResponse
    {
        $this->assertAttendanceRecordVisible($request, $attendanceRecord);

        $data = $request->validated();
        $isJustified = (bool) $data['is_justified'];
        $note = $data['justification_note'] ?? null;

        $attendanceRecord->is_justified = $isJustified;
        $attendanceRecord->justification_note = $note;
        $attendanceRecord->justified_at = now();
        $attendanceRecord->justified_by = $request->user()?->id;
        $attendanceRecord->save();

        AttendanceJustificationLog::query()->create([
            'attendance_record_id' => $attendanceRecord->id,
            'new_is_justified' => $isJustified,
            'note' => $note,
            'justified_at' => $attendanceRecord->justified_at,
            'validated_by' => $attendanceRecord->justified_by,
        ]);

        $this->alertService->handleAfterSave($attendanceRecord);

        return ApiResponse::success($this->toDto($attendanceRecord->fresh()), 'Justification enregistrée.');
    }

    public function stats(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['required', 'integer', 'exists:school_years,id'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'student_id' => ['nullable', 'integer', 'exists:students,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $q = AttendanceRecord::query()
            ->where('school_year_id', (int) $request->input('school_year_id'));

        $this->teacherScope->restrictAttendanceQuery($request->user(), $q);

        if ($cid = $request->input('class_id')) {
            $q->where('class_id', (int) $cid);
        }
        if ($sid = $request->input('student_id')) {
            $q->where('student_id', (int) $sid);
        }
        if ($from = $request->input('from')) {
            $q->whereDate('attendance_date', '>=', $from);
        }
        if ($to = $request->input('to')) {
            $q->whereDate('attendance_date', '<=', $to);
        }

        $total = (clone $q)->count();
        $present = (clone $q)->where('attendance_status', 'present')->count();
        $absent = (clone $q)->where('attendance_status', 'absent')->count();
        $late = (clone $q)->where('attendance_status', 'late')->count();
        $absentJustified = (clone $q)->where('attendance_status', 'absent')->where('is_justified', true)->count();
        $absentUnjustified = (clone $q)->where('attendance_status', 'absent')->where('is_justified', false)->count();
        $lateMinutes = (clone $q)->where('attendance_status', 'late')->sum('minutes_late');

        return ApiResponse::success([
            'total' => $total,
            'present' => $present,
            'absent' => $absent,
            'late' => $late,
            'absent_justified' => $absentJustified,
            'absent_unjustified' => $absentUnjustified,
            'late_minutes_total' => (int) $lateMinutes,
        ], 'Statistiques absences.');
    }

    private function assertAttendanceRecordVisible(Request $request, AttendanceRecord $attendanceRecord): void
    {
        $this->teacherScope->assertAttendanceWriteScope(
            $request->user(),
            (int) $attendanceRecord->school_year_id,
            (int) $attendanceRecord->class_id,
            $attendanceRecord->subject_id !== null ? (int) $attendanceRecord->subject_id : null,
            $attendanceRecord->schedule_entry_id !== null ? (int) $attendanceRecord->schedule_entry_id : null
        );
    }

    private function normalize(array $data): array
    {
        if (($data['attendance_status'] ?? null) !== 'late') {
            $data['minutes_late'] = null;
        } else {
            $data['minutes_late'] = isset($data['minutes_late']) ? (int) $data['minutes_late'] : 0;
        }

        if (($data['attendance_status'] ?? null) === 'present') {
            $data['is_justified'] = false;
            $data['justification_note'] = null;
            $data['justified_at'] = null;
            $data['justified_by'] = null;
        }

        return $data;
    }

    private function detectDuplicate(array $data): bool
    {
        $q = AttendanceRecord::query()
            ->where('student_id', (int) $data['student_id'])
            ->whereDate('attendance_date', (string) $data['attendance_date']);

        if (! empty($data['schedule_entry_id'])) {
            $q->where('schedule_entry_id', (int) $data['schedule_entry_id']);
        } else {
            $q->where('class_id', (int) $data['class_id']);
            if (! empty($data['subject_id'])) {
                $q->where('subject_id', (int) $data['subject_id']);
            }
        }

        return $q->exists();
    }

    private function upsertBulk(array $data): AttendanceRecord
    {
        $match = [
            'student_id' => (int) $data['student_id'],
            'attendance_date' => (string) $data['attendance_date'],
        ];

        if (! empty($data['schedule_entry_id'])) {
            $match['schedule_entry_id'] = (int) $data['schedule_entry_id'];
        } else {
            $match['class_id'] = (int) $data['class_id'];
            $match['subject_id'] = $data['subject_id'] ?? null;
        }

        /** @var AttendanceRecord $record */
        $record = AttendanceRecord::query()->updateOrCreate($match, $data);

        return $record;
    }

    /**
     * @return array<string, mixed>
     */
    private function toDto(AttendanceRecord $a): array
    {
        return [
            'id' => $a->id,
            'school_year_id' => (int) $a->school_year_id,
            'term_id' => $a->term_id ? (int) $a->term_id : null,
            'class_id' => (int) $a->class_id,
            'student_id' => (int) $a->student_id,
            'subject_id' => $a->subject_id ? (int) $a->subject_id : null,
            'teacher_id' => $a->teacher_id ? (int) $a->teacher_id : null,
            'schedule_entry_id' => $a->schedule_entry_id ? (int) $a->schedule_entry_id : null,
            'attendance_date' => $a->attendance_date?->format('Y-m-d'),
            'attendance_status' => $a->attendance_status,
            'minutes_late' => $a->minutes_late !== null ? (int) $a->minutes_late : null,
            'is_justified' => (bool) $a->is_justified,
            'justification_note' => $a->justification_note,
            'justified_at' => $a->justified_at?->toIso8601String(),
            'justified_by' => $a->justified_by ? (int) $a->justified_by : null,
            'marked_by' => $a->marked_by ? (int) $a->marked_by : null,
            'remarks' => $a->remarks,
            'created_at' => $a->created_at?->toIso8601String(),
            'updated_at' => $a->updated_at?->toIso8601String(),
        ];
    }
}

