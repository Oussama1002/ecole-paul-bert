<?php

namespace App\Services;

use App\Models\Room;
use App\Models\ScheduleEntry;
use App\Models\SchoolYear;
use App\Models\Teacher;
use App\Models\SchoolClass;
use Carbon\CarbonInterface;

class ScheduleConflictService
{
    /**
     * @return list<array{code: string, message: string, conflicting_entry_id: int}>
     */
    public function detect(ScheduleEntry $candidate, ?int $ignoreId, SchoolYear $schoolYear): array
    {
        $found = [];

        $query = ScheduleEntry::query()
            ->with([
                'teacher:id,first_name,last_name',
                'schoolClass:id,name',
                'room:id,name',
            ])
            ->where('school_year_id', $candidate->school_year_id)
            ->where('day_of_week', $candidate->day_of_week)
            ->where('status', '!=', 'cancelled')
            ->where(function ($q) use ($candidate) {
                $q->where('teacher_id', $candidate->teacher_id)
                    ->orWhere('class_id', $candidate->class_id);
                if ($candidate->room_id) {
                    $q->orWhere('room_id', $candidate->room_id);
                }
            });

        if ($ignoreId) {
            $query->where('id', '!=', $ignoreId);
        }

        $cStart = $this->toMinutes($candidate->start_time);
        $cEnd = $this->toMinutes($candidate->end_time);

        foreach ($query->cursor() as $other) {
            if (! $this->dateRangesOverlap($candidate, $other, $schoolYear)) {
                continue;
            }
            if (! $this->timeIntervalsOverlap($cStart, $cEnd, $other)) {
                continue;
            }

            if ((int) $other->teacher_id === (int) $candidate->teacher_id) {
                $teacherLabel = $this->teacherLabel($other->teacher);
                $found[] = [
                    'code' => 'teacher_busy',
                    'message' => "Conflit enseignant: {$teacherLabel} est déjà planifié {$this->formatSlot($other)}.",
                    'conflicting_entry_id' => (int) $other->id,
                ];
            }

            if (
                $candidate->room_id
                && $other->room_id
                && (int) $other->room_id === (int) $candidate->room_id
            ) {
                $roomLabel = $this->roomLabel($other->room);
                $found[] = [
                    'code' => 'room_busy',
                    'message' => "Conflit salle: {$roomLabel} est déjà occupée {$this->formatSlot($other)}.",
                    'conflicting_entry_id' => (int) $other->id,
                ];
            }

            if ((int) $other->class_id === (int) $candidate->class_id) {
                $classLabel = $this->classLabel($other->schoolClass);
                $found[] = [
                    'code' => 'class_busy',
                    'message' => "Conflit classe: {$classLabel} a déjà un cours {$this->formatSlot($other)}.",
                    'conflicting_entry_id' => (int) $other->id,
                ];
            }
        }

        return $this->uniqueConflicts($found);
    }

    /**
     * @param  list<array{code: string, message: string, conflicting_entry_id: int}>  $items
     * @return list<array{code: string, message: string, conflicting_entry_id: int}>
     */
    private function uniqueConflicts(array $items): array
    {
        $seen = [];
        $out = [];
        foreach ($items as $item) {
            $key = $item['code'].'-'.$item['conflicting_entry_id'];
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $item;
        }

        return $out;
    }

    private function dateRangesOverlap(
        ScheduleEntry $a,
        ScheduleEntry $b,
        SchoolYear $year
    ): bool {
        $aStart = $a->effective_start_date ?? $year->start_date;
        $aEnd = $a->effective_end_date ?? $year->end_date;
        $bStart = $b->effective_start_date ?? $year->start_date;
        $bEnd = $b->effective_end_date ?? $year->end_date;

        if (! $aStart || ! $aEnd || ! $bStart || ! $bEnd) {
            return true;
        }

        return $aStart->lte($bEnd) && $bStart->lte($aEnd);
    }

    private function timeIntervalsOverlap(int $cStart, int $cEnd, ScheduleEntry $other): bool
    {
        $oStart = $this->toMinutes($other->start_time);
        $oEnd = $this->toMinutes($other->end_time);

        return self::intervalsOverlap($cStart, $cEnd, $oStart, $oEnd);
    }

    /**
     * [start, end) overlap detection (adjacent slots do not overlap).
     */
    public static function intervalsOverlap(int $aStart, int $aEnd, int $bStart, int $bEnd): bool
    {
        return $aStart < $bEnd && $bStart < $aEnd;
    }

    private function toMinutes(mixed $time): int
    {
        if ($time instanceof CarbonInterface) {
            return $time->hour * 60 + $time->minute;
        }

        $s = (string) $time;
        if ($s === '') {
            return 0;
        }

        if (preg_match('/^(\d{1,2}):(\d{2})(?::(\d{2}))?/', $s, $m)) {
            return (int) $m[1] * 60 + (int) $m[2];
        }

        return 0;
    }

    private function formatSlot(ScheduleEntry $entry): string
    {
        $start = substr((string) $entry->start_time, 0, 5);
        $end = substr((string) $entry->end_time, 0, 5);

        return "({$start}–{$end})";
    }

    private function teacherLabel(?Teacher $teacher): string
    {
        if (! $teacher) {
            return 'L’enseignant';
        }

        return trim((string) ($teacher->last_name.' '.$teacher->first_name));
    }

    private function classLabel(?SchoolClass $class): string
    {
        return $class?->name ? (string) $class->name : 'La classe';
    }

    private function roomLabel(?Room $room): string
    {
        return $room?->name ? 'Salle '.$room->name : 'La salle';
    }
}
