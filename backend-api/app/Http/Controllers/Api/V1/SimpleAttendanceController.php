<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AttendanceRecord;
use App\Models\Teacher;
use App\Models\TeacherAttendance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Simple-mode attendance: student monthly totals + teacher daily tracking.
 *
 * Student side reads from the existing `attendance_records` table (no new
 * schema) and only reports monthly counts; daily marking still goes through
 * AttendanceRecordController::bulkMark to keep a single write path.
 *
 * Teacher side uses a dedicated `teacher_attendances` table — one row per
 * teacher per day, upserted on (teacher_id, attendance_date).
 */
class SimpleAttendanceController extends Controller
{
    /**
     * Monthly student attendance totals for a class.
     * GET /v1/simple/attendance/students?class_id&month=YYYY-MM
     */
    public function studentTotals(Request $request): JsonResponse
    {
        $data = $request->validate([
            'class_id' => 'required|integer|exists:classes,id',
            'month' => 'required|date_format:Y-m',
        ]);

        [$year, $month] = explode('-', $data['month']);
        $start = Carbon::create((int) $year, (int) $month, 1)->startOfMonth();
        $end = (clone $start)->endOfMonth();

        $rows = AttendanceRecord::query()
            ->where('class_id', $data['class_id'])
            ->whereBetween('attendance_date', [$start->toDateString(), $end->toDateString()])
            ->select('student_id', 'attendance_status', DB::raw('COUNT(*) as n'))
            ->groupBy('student_id', 'attendance_status')
            ->get();

        $byStudent = [];
        foreach ($rows as $r) {
            $sid = (int) $r->student_id;
            if (! isset($byStudent[$sid])) {
                $byStudent[$sid] = ['student_id' => $sid, 'present' => 0, 'absent' => 0, 'late' => 0];
            }
            $status = $r->attendance_status;
            if (isset($byStudent[$sid][$status])) {
                $byStudent[$sid][$status] = (int) $r->n;
            }
        }

        return ApiResponse::success([
            'month' => $data['month'],
            'class_id' => (int) $data['class_id'],
            'totals' => array_values($byStudent),
        ], 'Totaux de présence élèves.');
    }

    /**
     * Teacher attendance for a month (daily rows + per-teacher totals).
     * GET /v1/simple/attendance/teachers?month=YYYY-MM
     */
    public function teacherList(Request $request): JsonResponse
    {
        $data = $request->validate([
            'month' => 'required|date_format:Y-m',
        ]);

        [$year, $month] = explode('-', $data['month']);
        $start = Carbon::create((int) $year, (int) $month, 1)->startOfMonth();
        $end = (clone $start)->endOfMonth();

        $records = TeacherAttendance::query()
            ->whereBetween('attendance_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('attendance_date')
            ->get();

        $totals = [];
        foreach ($records as $r) {
            $tid = (int) $r->teacher_id;
            if (! isset($totals[$tid])) {
                $totals[$tid] = ['teacher_id' => $tid, 'present' => 0, 'absent' => 0, 'late' => 0];
            }
            if (isset($totals[$tid][$r->status])) {
                $totals[$tid][$r->status]++;
            }
        }

        return ApiResponse::success([
            'month' => $data['month'],
            'records' => $records->map(fn ($r) => [
                'id' => $r->id,
                'teacher_id' => (int) $r->teacher_id,
                'attendance_date' => $r->attendance_date?->toDateString(),
                'status' => $r->status,
                'minutes_late' => $r->minutes_late,
                'reason' => $r->reason,
            ])->all(),
            'totals' => array_values($totals),
        ], 'Présences enseignants du mois.');
    }

    /**
     * Upsert a single teacher/day attendance row.
     * POST /v1/simple/attendance/teachers
     */
    public function teacherUpsert(Request $request): JsonResponse
    {
        $data = $request->validate([
            'teacher_id' => 'required|integer|exists:teachers,id',
            'attendance_date' => 'required|date',
            'status' => 'required|in:present,absent,late',
            'minutes_late' => 'nullable|integer|min:0|max:600',
            'reason' => 'nullable|string|max:500',
        ]);

        $record = TeacherAttendance::updateOrCreate(
            [
                'teacher_id' => $data['teacher_id'],
                'attendance_date' => $data['attendance_date'],
            ],
            [
                'status' => $data['status'],
                'minutes_late' => $data['minutes_late'] ?? null,
                'reason' => $data['reason'] ?? null,
                'recorded_by' => $request->user()?->id,
            ]
        );

        return ApiResponse::success([
            'id' => $record->id,
            'teacher_id' => (int) $record->teacher_id,
            'attendance_date' => $record->attendance_date?->toDateString(),
            'status' => $record->status,
            'minutes_late' => $record->minutes_late,
            'reason' => $record->reason,
        ], 'Présence enseignant enregistrée.');
    }

    /**
     * Daily roster for one teacher day — used to pre-fill a marking screen.
     * GET /v1/simple/attendance/teachers/day?date=YYYY-MM-DD
     */
    public function teacherDay(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
        ]);

        $teachers = Teacher::query()
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name']);

        $existing = TeacherAttendance::query()
            ->whereDate('attendance_date', $data['date'])
            ->get()
            ->keyBy('teacher_id');

        return ApiResponse::success([
            'date' => $data['date'],
            'teachers' => $teachers->map(function ($t) use ($existing) {
                $row = $existing->get($t->id);
                return [
                    'teacher_id' => (int) $t->id,
                    'first_name' => $t->first_name,
                    'last_name' => $t->last_name,
                    'status' => $row?->status,
                    'minutes_late' => $row?->minutes_late,
                    'reason' => $row?->reason,
                ];
            })->all(),
        ], 'Feuille de présence enseignants.');
    }

    /**
     * Delete a single teacher attendance row.
     * DELETE /v1/simple/attendance/teachers/{teacherAttendance}
     */
    public function teacherDestroy(TeacherAttendance $teacherAttendance): JsonResponse
    {
        $teacherAttendance->delete();
        return ApiResponse::success(null, 'Présence enseignant supprimée.');
    }
}
