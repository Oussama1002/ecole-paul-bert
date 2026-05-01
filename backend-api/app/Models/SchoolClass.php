<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function mainTeacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class, 'main_teacher_id');
    }
}
