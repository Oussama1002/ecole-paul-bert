<?php

namespace App\Services;

use App\Models\FeeAssignment;
use App\Models\User;
use Carbon\Carbon;

class FeePaymentReminderService
{
    private const REMINDER_HOURS = 48;

    public function __construct(
        private FeePaymentDueDateService $dueDates,
        private SystemNotificationDispatcher $notify
    ) {}

    public function dispatchDueReminders(?Carbon $now = null): int
    {
        $now = ($now ?? now())->copy();
        $sent = 0;

        $assignments = FeeAssignment::query()
            ->with(['feeType:id,name,code,frequency,start_date', 'student:id,first_name,last_name'])
            ->whereNotIn('status', ['cancelled', 'waived'])
            ->whereNull('cancelled_at')
            ->where(function ($q) {
                $q->where('balance', '>', 0.001)
                    ->orWhereIn('status', ['pending', 'partial', 'overdue']);
            })
            ->get();

        foreach ($assignments as $assignment) {
            $paymentDate = $this->dueDates->nextPaymentDate($assignment, $now);
            if ($paymentDate === null) {
                continue;
            }

            $remindFrom = $paymentDate->copy()->startOfDay()->subHours(self::REMINDER_HOURS);
            $remindUntil = $paymentDate->copy()->endOfDay();

            if ($now->lt($remindFrom) || $now->gt($remindUntil)) {
                continue;
            }

            $student = $assignment->student;
            $feeName = $assignment->feeType?->name ?? 'Frais';
            $studentLabel = $student
                ? trim($student->last_name.' '.$student->first_name)
                : 'Élève #'.$assignment->student_id;

            $dueLabel = $paymentDate->locale('fr')->isoFormat('dddd D MMMM YYYY');
            $title = 'Échéance de paiement dans 48 h';
            $body = "{$studentLabel} — {$feeName} : échéance le {$dueLabel}.";

            $data = [
                'student_id' => (int) $assignment->student_id,
                'fee_assignment_id' => (int) $assignment->id,
                'fee_type_id' => (int) $assignment->fee_type_id,
                'payment_due_date' => $paymentDate->toDateString(),
                'balance' => (string) $assignment->balance,
            ];

            $dedupeBase = "fee.payment.reminder:{$assignment->id}:{$paymentDate->toDateString()}";
            foreach ($this->adminUserIds() as $userId) {
                $this->notify->notifyUser(
                    $userId,
                    'fee.payment.reminder',
                    $title,
                    $body,
                    $data,
                    "{$dedupeBase}:{$userId}"
                );
            }

            $sent++;
        }

        return $sent;
    }

    /**
     * @return list<int>
     */
    private function adminUserIds(): array
    {
        return User::query()
            ->where('status', 'active')
            ->get()
            ->filter(fn (User $u) => $u->hasPermission('finance.view'))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }
}
