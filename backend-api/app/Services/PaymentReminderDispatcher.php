<?php

namespace App\Services;

use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\NotificationLog;
use App\Models\SchoolYear;
use App\Notifications\PaymentReminder;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Finds unpaid invoices that are due within the next 7 days (or already
 * overdue) for the active school year and sends a PaymentReminder to each
 * student's guardian(s). A student is skipped when any of their guardians
 * already received a reminder within the last 3 days.
 */
class PaymentReminderDispatcher
{
    private const DUE_WINDOW_DAYS = 7;

    private const COOLDOWN_DAYS = 3;

    public function __construct(
        private GuardianNotifier $guardianNotifier
    ) {}

    /**
     * @return array{invoices: int, sent: int, skipped: int}
     */
    public function dispatch(?Carbon $now = null): array
    {
        $now = ($now ?? now())->copy();
        $today = $now->copy()->startOfDay();
        $horizon = $today->copy()->addDays(self::DUE_WINDOW_DAYS)->endOfDay();

        $schoolYearId = $this->activeSchoolYearId();

        $query = Invoice::query()
            ->with(['student:id,first_name,last_name'])
            ->whereIn('status', ['issued', 'partial'])
            ->where('amount_due', '>', 0.001)
            ->whereNull('cancelled_at')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<=', $horizon->toDateString());

        if ($schoolYearId !== null) {
            $query->where('school_year_id', $schoolYearId);
        }

        $invoices = 0;
        $sent = 0;
        $skipped = 0;
        $processedStudents = [];

        $query->orderBy('due_date')->chunkById(200, function ($rows) use (&$invoices, &$sent, &$skipped, &$processedStudents) {
            foreach ($rows as $invoice) {
                $invoices++;
                $studentId = (int) $invoice->student_id;

                // One reminder per student per run.
                if (in_array($studentId, $processedStudents, true)) {
                    $skipped++;

                    continue;
                }
                $processedStudents[] = $studentId;

                if ($this->recentlyReminded($studentId)) {
                    $skipped++;

                    continue;
                }

                $student = $invoice->student;
                $studentName = $student
                    ? trim((string) ($student->first_name.' '.$student->last_name))
                    : 'Élève';

                $count = $this->guardianNotifier->notifyStudentGuardians(
                    $studentId,
                    new PaymentReminder(
                        studentName: $studentName,
                        amount: (float) $invoice->amount_due,
                        dueDate: $invoice->due_date?->format('Y-m-d') ?? now()->toDateString(),
                        feeLabel: $invoice->invoice_number ? 'Facture '.$invoice->invoice_number : null,
                        studentId: $studentId,
                    )
                );

                if ($count > 0) {
                    $sent++;
                } else {
                    $skipped++;
                }
            }
        });

        Log::info("payment-reminders: invoices={$invoices} sent={$sent} skipped={$skipped}");

        return ['invoices' => $invoices, 'sent' => $sent, 'skipped' => $skipped];
    }

    /**
     * True when any guardian of the student received a PaymentReminder within
     * the cooldown window.
     */
    private function recentlyReminded(int $studentId): bool
    {
        $guardianIds = $this->guardianNotifier
            ->guardiansForStudent($studentId)
            ->map(fn (Guardian $g) => (int) $g->id)
            ->all();

        if ($guardianIds === []) {
            return false;
        }

        $since = now()->subDays(self::COOLDOWN_DAYS);

        return NotificationLog::query()
            ->where('notification_type', PaymentReminder::class)
            ->where('notifiable_type', Guardian::class)
            ->whereIn('notifiable_id', $guardianIds)
            ->where('status', 'sent')
            ->where('created_at', '>=', $since)
            ->exists();
    }

    private function activeSchoolYearId(): ?int
    {
        $id = SchoolYear::query()->where('is_current', true)->value('id');

        return $id !== null ? (int) $id : null;
    }
}
