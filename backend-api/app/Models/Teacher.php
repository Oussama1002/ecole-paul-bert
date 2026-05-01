<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Teacher extends Model
{
    protected $fillable = [
        'user_id',
        'employee_code',
        'first_name',
        'last_name',
        'email',
        'phone',
        'address',
        'gender',
        'date_of_birth',
        'hire_date',
        'qualification',
        'specialization',
        'employment_type',
        'years_experience',
        'salary_base',
        'status',
        'emergency_contact_name',
        'emergency_contact_phone',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'hire_date' => 'date',
            'years_experience' => 'integer',
            'salary_base' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function mainClasses(): HasMany
    {
        return $this->hasMany(SchoolClass::class, 'main_teacher_id');
    }

    public function teacherClassSubjects(): HasMany
    {
        return $this->hasMany(TeacherClassSubject::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(TeacherDocument::class);
    }

    public function scheduleEntries(): HasMany
    {
        return $this->hasMany(ScheduleEntry::class);
    }
}
