<?php

namespace Tests\Unit;

use App\Services\ScheduleConflictService;
use PHPUnit\Framework\TestCase;

class ScheduleConflictIntervalsTest extends TestCase
{
    /**
     * @dataProvider overlapProvider
     */
    public function test_interval_overlap_minutes(
        int $aStart,
        int $aEnd,
        int $bStart,
        int $bEnd,
        bool $expectOverlap
    ): void {
        $this->assertSame(
            $expectOverlap,
            ScheduleConflictService::intervalsOverlap($aStart, $aEnd, $bStart, $bEnd)
        );
    }

    /**
     * @return iterable<string, array{int, int, int, int, bool}>
     */
    public static function overlapProvider(): iterable
    {
        yield 'overlap' => [8 * 60, 9 * 60, 8 * 60 + 30, 10 * 60, true];
        yield 'adjacent_no_overlap' => [8 * 60, 9 * 60, 9 * 60, 10 * 60, false];
        yield 'disjoint' => [8 * 60, 9 * 60, 10 * 60, 11 * 60, false];
        yield 'nested' => [8 * 60, 12 * 60, 9 * 60, 10 * 60, true];
    }
}
