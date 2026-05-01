<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class Enrollment extends Model
{
    public $incrementing = false;
    protected $keyType = 'int';

    protected $fillable = [
        'student_id',
        'school_year_id',
        'class_id',
        'enrollment_number',
        'enrollment_date',
        'academic_status',
        'admission_type',
        'registration_status',
        'remarks',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'enrollment_date' => 'date',
        ];
    }

    public static function academicStatusIsActive(string $status): bool
    {
        return ! in_array($status, ['cancelled', 'completed', 'transferred_out'], true);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    protected static function booted(): void
    {
        static::creating(function (Enrollment $enrollment): void {
            if (! $enrollment->getAttribute('id')) {
                $nextId = (int) DB::table('enrollments')->max('id') + 1;
                $enrollment->setAttribute('id', $nextId);
            }
        });
    }
}
