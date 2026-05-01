<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class StudentGuardian extends Pivot
{
    protected $table = 'student_guardians';

    public $incrementing = true;

    protected $fillable = [
        'student_id',
        'guardian_id',
        'is_legal_guardian',
        'can_receive_notifications',
        'can_pickup_student',
        'is_primary_contact',
    ];

    protected function casts(): array
    {
        return [
            'is_legal_guardian' => 'boolean',
            'can_receive_notifications' => 'boolean',
            'can_pickup_student' => 'boolean',
            'is_primary_contact' => 'boolean',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class);
    }
}
