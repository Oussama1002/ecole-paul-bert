<?php

namespace Tests\Unit;

use App\Models\FeeAssignment;
use App\Models\FeeType;
use App\Services\FeePaymentDueDateService;
use Carbon\Carbon;
use Tests\TestCase;

class FeePaymentDueDateServiceTest extends TestCase
{
    private FeePaymentDueDateService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new FeePaymentDueDateService;
    }

    public function test_once_fee_uses_start_date_anchor(): void
    {
        $type = new FeeType([
            'frequency' => 'one_time',
            'start_date' => '2026-06-15',
        ]);
        $assignment = new FeeAssignment([
            'status' => 'pending',
            'balance' => 100,
            'amount_paid' => 0,
        ]);
        $assignment->setRelation('feeType', $type);

        $next = $this->service->nextPaymentDate($assignment, Carbon::parse('2026-06-01'));

        $this->assertNotNull($next);
        $this->assertSame('2026-06-15', $next->toDateString());
    }

    public function test_monthly_fee_advances_from_start_date(): void
    {
        $type = new FeeType([
            'frequency' => 'monthly',
            'start_date' => '2026-01-05',
        ]);
        $assignment = new FeeAssignment([
            'status' => 'partial',
            'balance' => 50,
            'amount_paid' => 10,
        ]);
        $assignment->setRelation('feeType', $type);

        $next = $this->service->nextPaymentDate($assignment, Carbon::parse('2026-03-10'));

        $this->assertNotNull($next);
        $this->assertSame('2026-04-05', $next->toDateString());
    }

    public function test_paid_assignment_returns_null_for_recurring(): void
    {
        $type = new FeeType([
            'frequency' => 'monthly',
            'start_date' => '2026-01-05',
        ]);
        $assignment = new FeeAssignment([
            'status' => 'paid',
            'balance' => 0,
            'amount_paid' => 100,
        ]);
        $assignment->setRelation('feeType', $type);

        $this->assertNull($this->service->nextPaymentDate($assignment, Carbon::parse('2026-03-10')));
    }
}
