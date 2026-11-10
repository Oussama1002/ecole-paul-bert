<?php

namespace App\Console\Commands;

use App\Services\PaymentReminderDispatcher;
use Illuminate\Console\Command;

class SendPaymentReminders extends Command
{
    protected $signature = 'app:send-payment-reminders';

    protected $description = 'Send payment reminders to guardians for unpaid invoices due within 7 days or overdue (active school year).';

    public function handle(PaymentReminderDispatcher $dispatcher): int
    {
        $result = $dispatcher->dispatch();

        $this->info(sprintf(
            'Payment reminders — invoices scanned: %d, sent: %d, skipped: %d',
            $result['invoices'],
            $result['sent'],
            $result['skipped'],
        ));

        return self::SUCCESS;
    }
}
