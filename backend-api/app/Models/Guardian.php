<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Guardian extends Model
{
    protected $fillable = [
        'first_name',
        'last_name',
        'relationship_type',
        'phone',
        'alternate_phone',
        'email',
        'profession',
        'national_id',
        'address',
        'city',
        'is_primary_contact',
    ];

    protected function casts(): array
    {
        return [
            'is_primary_contact' => 'boolean',
        ];
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'student_guardians')
            ->using(StudentGuardian::class)
            ->withPivot([
                'is_legal_guardian',
                'can_receive_notifications',
                'can_pickup_student',
                'is_primary_contact',
            ])
            ->withTimestamps(false);
    }
}
