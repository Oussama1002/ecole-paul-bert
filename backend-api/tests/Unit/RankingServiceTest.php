<?php

namespace Tests\Unit;

use App\Services\RankingService;
use PHPUnit\Framework\TestCase;

class RankingServiceTest extends TestCase
{
    public function test_competition_ranking_handles_ties(): void
    {
        $svc = new RankingService();

        $ranks = $svc->rank([
            ['id' => 1, 'value' => 15.5],
            ['id' => 2, 'value' => 15.5],
            ['id' => 3, 'value' => 14.0],
            ['id' => 4, 'value' => null],
        ], 'competition');

        $this->assertSame(1, $ranks[1]);
        $this->assertSame(1, $ranks[2]);
        $this->assertSame(3, $ranks[3]);
        $this->assertNull($ranks[4]);
    }

    public function test_dense_ranking_handles_ties(): void
    {
        $svc = new RankingService();

        $ranks = $svc->rank([
            ['id' => 1, 'value' => 15.5],
            ['id' => 2, 'value' => 15.5],
            ['id' => 3, 'value' => 14.0],
        ], 'dense');

        $this->assertSame(1, $ranks[1]);
        $this->assertSame(1, $ranks[2]);
        $this->assertSame(2, $ranks[3]);
    }
}

