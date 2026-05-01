<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    protected $fillable = [
        'school_year_id',
        'term_id',
        'class_id',
        'student_id',
        'subject_id',
        'teacher_id',
        'schedule_entry_id',
        'attendance_date',
        'attendance_status',
        'minutes_late',
        'is_justified',
        'justification_note',
        'justified_at',
        'justified_by',
        'marked_by',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'attendance_date' => 'date',
            'is_justified' => 'boolean',
            'justified_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function scheduleEntry(): BelongsTo
    {
        return $this->belongsTo(ScheduleEntry::class, 'schedule_entry_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }
}
