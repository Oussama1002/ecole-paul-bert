<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Student extends Model
{
    use SoftDeletes;
    public $incrementing = false;
    protected $keyType = 'int';

    protected $fillable = [
        'student_code',
        'first_name',
        'last_name',
        'first_name_ar',
        'last_name_ar',
        'photo_path',
        'gender',
        'date_of_birth',
        'place_of_birth',
        'nationality',
        'address',
        'city',
        'status',
        'admission_date',
        'registration_date',
        'previous_school',
        'blood_group',
        'medical_notes',
        'special_needs',
        'emergency_contact_name',
        'emergency_contact_phone',
        'parent_phone_1',
        'parent_phone_2',
        'parent_phone_3',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'admission_date' => 'date',
            'registration_date' => 'date',
        ];
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function studentClassAssignments(): HasMany
    {
        return $this->hasMany(StudentClassAssignment::class);
    }

    public function guardians(): BelongsToMany
    {
        return $this->belongsToMany(Guardian::class, 'student_guardians')
            ->using(StudentGuardian::class)
            ->withPivot([
                'is_legal_guardian',
                'can_receive_notifications',
                'can_pickup_student',
                'is_primary_contact',
            ]);
    }

    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function feeAssignments(): HasMany
    {
        return $this->hasMany(FeeAssignment::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    protected static function booted(): void
    {
        static::creating(function (Student $student): void {
            // Legacy DB compatibility: some schemas have non auto-increment IDs.
            if (! $student->getAttribute('id')) {
                $nextId = (int) DB::table('students')->max('id') + 1;
                $student->setAttribute('id', $nextId);
            }
        });
    }
}
