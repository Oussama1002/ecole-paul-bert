<?php

namespace App\Services;

use App\Models\SchoolClass;
use App\Models\SchoolYear;

class ClassSchoolYearService
{
    /**
     * @param  array<int>|null  $schoolYearIds  null or empty = all school years
     * @return array<int>
     */
    public function resolveSchoolYearIds(?array $schoolYearIds): array
    {
        if ($schoolYearIds !== null && $schoolYearIds !== []) {
            return array_values(array_unique(array_map('intval', $schoolYearIds)));
        }

        return SchoolYear::query()->orderBy('start_date')->pluck('id')->all();
    }

    public function syncSchoolYears(SchoolClass $class, ?array $schoolYearIds): void
    {
        $ids = $this->resolveSchoolYearIds($schoolYearIds);
        $class->schoolYears()->sync($ids);
    }
}
