<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportCard extends Model
{
    protected $fillable = [
        'school_year_id',
        'term_id',
        'evaluation_period_id',
        'class_id',
        'student_id',
        'subject_averages',
        'period_average',
        'rank',
        'rank_out_of',
        'absent_count',
        'late_count',
        'status',
        'generated_at',
        'generated_by',
        'published_at',
        'published_by',
        'archived_at',
        'archived_by',
        'pdf_path',
    ];

    protected function casts(): array
    {
        return [
            'subject_averages' => 'array',
            'generated_at' => 'datetime',
            'published_at' => 'datetime',
            'archived_at' => 'datetime',
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

    public function evaluationPeriod(): BelongsTo
    {
        return $this->belongsTo(EvaluationPeriod::class);
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }
}

