<?php

namespace App\Console\Commands;

use App\Services\FeePaymentReminderService;
use Illuminate\Console\Command;

class SendFeePaymentReminders extends Command
{
    protected $signature = 'finance:fee-payment-reminders';

    protected $description = 'Notify admins 48 hours before student fee payment due dates';

    public function handle(FeePaymentReminderService $reminders): int
    {
        $count = $reminders->dispatchDueReminders();
        $this->info("Fee payment reminders dispatched: {$count}");

        return self::SUCCESS;
    }
}
