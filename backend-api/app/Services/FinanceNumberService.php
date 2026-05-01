<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;

class FinanceNumberService
{
    public function invoiceNumber(Invoice $invoice): string
    {
        $year = $invoice->issue_date?->format('Y') ?? date('Y');

        return 'INV-'.$year.'-'.str_pad((string) $invoice->id, 6, '0', STR_PAD_LEFT);
    }

    public function paymentReference(Payment $payment): string
    {
        $year = $payment->payment_date?->format('Y') ?? date('Y');

        return 'PAY-'.$year.'-'.str_pad((string) $payment->id, 6, '0', STR_PAD_LEFT);
    }
}

