<?php

namespace App\Services;

use App\Models\Guardian;
use App\Models\Student;
use App\Notifications\SchoolNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Central helper for sending notifications to a student's guardian(s).
 *
 * It resolves the guardians linked to a student through the StudentGuardian
 * pivot, honouring the per-link `can_receive_notifications` flag, and keeps only
 * those who have a usable email or phone. Failures never bubble up to the
 * triggering request — notifications are best-effort side effects.
 */
class GuardianNotifier
{
    /**
     * @return int number of guardians the notification was dispatched to
     */
    public function notifyStudentGuardians(int $studentId, SchoolNotification $notification): int
    {
        $guardians = $this->guardiansForStudent($studentId);
        if ($guardians->isEmpty()) {
            return 0;
        }

        try {
            Notification::send($guardians, $notification);
        } catch (\Throwable $e) {
            Log::error('guardian_notify.failed: '.$e->getMessage());

            return 0;
        }

        return $guardians->count();
    }

    /**
     * Guardians who may receive notifications for the given student.
     *
     * @return Collection<int, Guardian>
     */
    public function guardiansForStudent(int $studentId): Collection
    {
        $student = Student::query()->with(['guardians'])->find($studentId);
        if (! $student) {
            return collect();
        }

        return $student->guardians
            ->filter(function (Guardian $g) {
                $canReceive = $g->pivot?->can_receive_notifications;
                // Default to allowed when the pivot flag is absent.
                if ($canReceive !== null && ! (bool) $canReceive) {
                    return false;
                }

                $hasEmail = trim((string) $g->email) !== '';
                $hasPhone = trim((string) $g->phone) !== '';

                return $hasEmail || $hasPhone;
            })
            ->values();
    }
}
