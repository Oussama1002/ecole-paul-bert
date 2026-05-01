<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherClassSubject extends Model
{
    protected $table = 'teacher_class_subjects';

    protected $fillable = [
        'teacher_id',
        'class_id',
        'subject_id',
        'school_year_id',
        'weekly_hours',
        'is_primary',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'weekly_hours' => 'decimal:2',
            'is_primary' => 'boolean',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }
}
