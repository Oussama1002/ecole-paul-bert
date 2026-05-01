<?php

namespace App\Services;

class RankingService
{
    /**
     * Compute ranks with ex-aequo handling.
     *
     * Strategy "competition" yields 1,1,3... (a.k.a. standard competition ranking).
     * Strategy "dense" yields 1,1,2...
     *
     * @param  list<array{id:int, value:float|null}>  $items
     * @return array<int, int|null> map[id] => rank (1..n) or null if value null
     */
    public function rank(array $items, string $strategy = 'competition'): array
    {
        $strategy = in_array($strategy, ['competition', 'dense'], true) ? $strategy : 'competition';

        // Sort by value desc, nulls last
        usort($items, static function (array $a, array $b): int {
            $va = $a['value'];
            $vb = $b['value'];
            if ($va === null && $vb === null) {
                return 0;
            }
            if ($va === null) {
                return 1;
            }
            if ($vb === null) {
                return -1;
            }
            if ($va === $vb) {
                return 0;
            }

            return $va > $vb ? -1 : 1;
        });

        $out = [];
        $pos = 0;
        $rank = 0;
        $denseRank = 0;
        $lastValue = null;

        foreach ($items as $it) {
            $pos++;
            $id = (int) $it['id'];
            $value = $it['value'];
            if ($value === null) {
                $out[$id] = null;
                continue;
            }

            if ($lastValue === null || $value !== $lastValue) {
                $rank = $pos;
                $denseRank++;
                $lastValue = $value;
            }

            $out[$id] = $strategy === 'dense' ? $denseRank : $rank;
        }

        return $out;
    }
}

