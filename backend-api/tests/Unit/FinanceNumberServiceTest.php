<?php

namespace Tests\Unit;

use App\Models\Invoice;
use App\Models\Payment;
use App\Services\FinanceNumberService;
use Tests\TestCase;

class FinanceNumberServiceTest extends TestCase
{
    public function test_invoice_number_uses_id_and_year(): void
    {
        $inv = new Invoice([
            'issue_date' => '2026-04-13',
        ]);
        $inv->id = 12;

        $svc = new FinanceNumberService();
        $this->assertSame('INV-2026-000012', $svc->invoiceNumber($inv));
    }

    public function test_payment_reference_uses_id_and_year(): void
    {
        $pay = new Payment([
            'payment_date' => '2026-04-13',
        ]);
        $pay->id = 7;

        $svc = new FinanceNumberService();
        $this->assertSame('PAY-2026-000007', $svc->paymentReference($pay));
    }
}

