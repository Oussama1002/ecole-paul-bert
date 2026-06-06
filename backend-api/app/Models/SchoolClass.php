<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SchoolClass extends Model
{
    protected $table = 'classes';

    protected $fillable = [
        'level_id',
        'school_year_id',
        'name',
        'code',
        'section',
        'max_students',
        'room_label',
        'main_teacher_id',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'max_students' => 'integer',
        ];
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function schoolYears(): BelongsToMany
    {
        return $this->belongsToMany(SchoolYear::class, 'class_school_year', 'class_id', 'school_year_id');
    }

    public function scopeForSchoolYear(Builder $query, int $schoolYearId): Builder
    {
        return $query->where(function (Builder $q) use ($schoolYearId) {
            $q->where('school_year_id', $schoolYearId)
                ->orWhereHas('schoolYears', fn (Builder $sq) => $sq->where('school_years.id', $schoolYearId));
        });
    }

    public function isOfferedInSchoolYear(int $schoolYearId): bool
    {
        if ($this->school_year_id !== null) {
            return (int) $this->school_year_id === $schoolYearId;
        }

        if ($this->relationLoaded('schoolYears')) {
            return $this->schoolYears->contains('id', $schoolYearId);
        }

        return $this->schoolYears()->where('school_years.id', $schoolYearId)->exists();
    }

    public function mainTeacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class, 'main_teacher_id');
    }
}
