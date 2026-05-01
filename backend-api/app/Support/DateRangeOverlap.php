<?php

namespace App\Support;

use Carbon\CarbonInterface;

final class DateRangeOverlap
{
    /**
     * @param  iterable<int, array{start: CarbonInterface, end: CarbonInterface}>  $others
     */
    public static function overlapsAny(
        CarbonInterface $start,
        CarbonInterface $end,
        iterable $others
    ): bool {
        foreach ($others as $range) {
            if (self::rangesOverlap($start, $end, $range['start'], $range['end'])) {
                return true;
            }
        }

        return false;
    }

    public static function rangesOverlap(
        CarbonInterface $aStart,
        CarbonInterface $aEnd,
        CarbonInterface $bStart,
        CarbonInterface $bEnd
    ): bool {
        return $aStart->lte($bEnd) && $bStart->lte($aEnd);
    }
}
