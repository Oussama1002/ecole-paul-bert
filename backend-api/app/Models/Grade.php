<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    protected $fillable = [
        'school_year_id',
        'term_id',
        'evaluation_period_id',
        'evaluation_type_id',
        'class_id',
        'student_id',
        'subject_id',
        'teacher_id',
        'score',
        'max_score',
        'weighted_score',
        'coefficient',
        'appreciation',
        'is_validated',
        'validated_at',
        'validated_by',
        'entered_by',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }
}
