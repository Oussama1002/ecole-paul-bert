<?php

namespace Tests\Unit;

use App\Models\FeeAssignment;
use App\Services\FinanceCalculatorService;
use Tests\TestCase;

class FinanceCalculatorServiceTest extends TestCase
{
    public function test_fee_assignment_status_and_balance(): void
    {
        $fa = new FeeAssignment([
            'amount_due' => 100,
            'discount_amount' => 10,
            'scholarship_amount' => 0,
            'amount_paid' => 0,
            'status' => 'pending',
        ]);

        $svc = new FinanceCalculatorService();
        $svc->recomputeFeeAssignment($fa);

        $this->assertSame('pending', $fa->status);
        $this->assertSame('90.00', (string) $fa->balance);

        $fa->amount_paid = 50;
        $svc->recomputeFeeAssignment($fa);
        $this->assertSame('partial', $fa->status);
        $this->assertSame('40.00', (string) $fa->balance);

        $fa->amount_paid = 1000;
        $svc->recomputeFeeAssignment($fa);
        $this->assertSame('paid', $fa->status);
        $this->assertSame('0.00', (string) $fa->balance);
    }
}

