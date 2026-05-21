<?php

namespace App\Services;

use App\Models\FeeAssignment;
use Carbon\Carbon;
use Carbon\CarbonInterface;

class FeePaymentDueDateService
{
    /**
     * Next calendar payment date for this assignment (start of day), or null if none applies.
     */
    public function nextPaymentDate(FeeAssignment $assignment, ?CarbonInterface $asOf = null): ?Carbon
    {
        if (in_array($assignment->status, ['cancelled', 'waived'], true) || $assignment->cancelled_at !== null) {
            return null;
        }

        $assignment->loadMissing('feeType');
        $feeType = $assignment->feeType;
        if (! $feeType) {
            return null;
        }

        $anchor = $assignment->due_date ?? $feeType->start_date;
        if ($anchor === null) {
            return null;
        }

        $asOf = Carbon::parse($asOf ?? now())->startOfDay();
        $anchor = Carbon::parse($anchor)->startOfDay();
        $frequency = $this->normalizeFrequency((string) $feeType->frequency);

        if ($frequency === 'once') {
            if ((float) $assignment->balance <= 0.001 && $assignment->status === 'paid') {
                return null;
            }

            return $anchor->greaterThanOrEqualTo($asOf) ? $anchor : null;
        }

        if ((float) $assignment->balance <= 0.001) {
            return null;
        }

        $cursor = $anchor->copy();
        $limit = $asOf->copy()->addYears(2);

        while ($cursor->lessThanOrEqualTo($limit)) {
            if ($cursor->greaterThanOrEqualTo($asOf)) {
                return $cursor;
            }
            $cursor = $this->advance($cursor, $frequency);
        }

        return null;
    }

    public function normalizeFrequency(string $frequency): string
    {
        return match ($frequency) {
            'one_time' => 'once',
            default => $frequency,
        };
    }

    private function advance(Carbon $date, string $frequency): Carbon
    {
        return match ($frequency) {
            'monthly' => $date->copy()->addMonthNoOverflow(),
            'term' => $date->copy()->addMonthsNoOverflow(3),
            'yearly' => $date->copy()->addYearNoOverflow(),
            default => $date->copy()->addMonthNoOverflow(),
        };
    }
}
