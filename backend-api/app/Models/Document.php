<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Document extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'document_type',
        'category',
        'title',
        'description',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'student_id',
        'teacher_id',
        'invoice_id',
        'payment_id',
        'expense_id',
        'uploaded_by',
        'is_confidential',
        'visibility_scope',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'is_confidential' => 'boolean',
            'file_size' => 'integer',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }
}
