<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\AttendanceRecord;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;

class AttendanceAlertService
{
    public function __construct(
        private SystemNotificationDispatcher $notify
    ) {}

    public function handleAfterSave(AttendanceRecord $record): void
    {
        // Only meaningful for absences/late
        if (! in_array($record->attendance_status, ['absent', 'late'], true)) {
            return;
        }

        $schoolYearId = (int) $record->school_year_id;
        $studentId = (int) $record->student_id;

        $windowDays = (int) AppSetting::get(
            'attendance_alert_window_days',
            (int) (config('attendance.alerts.window_days') ?? 30)
        );
        $thresholdAbsences = (int) AppSetting::get(
            'attendance_alert_unjustified_absences',
            (int) (config('attendance.alerts.unjustified_absences_threshold') ?? 3)
        );
        $thresholdLates = (int) AppSetting::get(
            'attendance_alert_late_count',
            (int) (config('attendance.alerts.late_count_threshold') ?? 5)
        );

        $to = Carbon::parse($record->attendance_date)->endOfDay();
        $from = $to->copy()->subDays($windowDays)->startOfDay();

        $q = AttendanceRecord::query()
            ->where('school_year_id', $schoolYearId)
            ->where('student_id', $studentId)
            ->whereBetween('attendance_date', [$from->toDateString(), $to->toDateString()]);

        $unjustifiedAbsences = (clone $q)
            ->where('attendance_status', 'absent')
            ->where('is_justified', false)
            ->count();

        $lateCount = (clone $q)
            ->where('attendance_status', 'late')
            ->count();

        if ($unjustifiedAbsences < $thresholdAbsences && $lateCount < $thresholdLates) {
            return;
        }

        $student = Student::query()->find($studentId);
        $class = SchoolClass::query()->find((int) $record->class_id);
        if (! $student || ! $class) {
            return;
        }

        $recipients = $this->resolveRecipients($class);
        if ($recipients === []) {
            return;
        }

        $periodKey = $from->toDateString().'_'.$to->toDateString();
        foreach ($recipients as $user) {
            if ($unjustifiedAbsences >= $thresholdAbsences) {
                $this->notifyOnce(
                    $user,
                    'attendance.alert.unjustified_absences',
                    "Seuil absences non justifiées atteint",
                    "L’élève {$student->last_name} {$student->first_name} ({$class->name}) a {$unjustifiedAbsences} absence(s) non justifiée(s) sur {$windowDays} jours.",
                    [
                        'student_id' => $student->id,
                        'class_id' => $class->id,
                        'school_year_id' => $schoolYearId,
                        'from' => $from->toDateString(),
                        'to' => $to->toDateString(),
                        'count' => $unjustifiedAbsences,
                        'threshold' => $thresholdAbsences,
                    ],
                    "attendance.alert.unjustified_absences:{$schoolYearId}:{$studentId}:{$periodKey}:{$thresholdAbsences}:{$user->id}"
                );
            }

            if ($lateCount >= $thresholdLates) {
                $this->notifyOnce(
                    $user,
                    'attendance.alert.late_count',
                    "Seuil retards atteint",
                    "L’élève {$student->last_name} {$student->first_name} ({$class->name}) a {$lateCount} retard(s) sur {$windowDays} jours.",
                    [
                        'student_id' => $student->id,
                        'class_id' => $class->id,
                        'school_year_id' => $schoolYearId,
                        'from' => $from->toDateString(),
                        'to' => $to->toDateString(),
                        'count' => $lateCount,
                        'threshold' => $thresholdLates,
                    ],
                    "attendance.alert.late_count:{$schoolYearId}:{$studentId}:{$periodKey}:{$thresholdLates}:{$user->id}"
                );
            }
        }
    }

    /**
     * @return list<User>
     */
    private function resolveRecipients(SchoolClass $class): array
    {
        $class->loadMissing('mainTeacher.user');
        $teacherUser = $class->mainTeacher?->user;
        if ($teacherUser) {
            return [$teacherUser];
        }

        // Fallback: notify super admins (role code super_admin)
        return User::query()
            ->whereHas('role', fn ($q) => $q->where('code', 'super_admin'))
            ->limit(10)
            ->get()
            ->all();
    }

    private function notifyOnce(User $user, string $type, string $title, ?string $body, array $data, string $dedupeKey): void
    {
        $this->notify->notifyUser(
            (int) $user->id,
            $type,
            $title,
            $body,
            $data,
            $dedupeKey
        );
    }
}

