<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeAssignment extends Model
{
    protected $fillable = [
        'student_id',
        'school_year_id',
        'fee_type_id',
        'amount_due',
        'due_date',
        'amount_paid',
        'discount_amount',
        'scholarship_amount',
        'balance',
        'status',
        'notes',
        'created_by',
        'cancelled_at',
        'cancelled_by',
        'cancel_reason',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'amount_due' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'scholarship_amount' => 'decimal:2',
            'balance' => 'decimal:2',
            'cancelled_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function feeType(): BelongsTo
    {
        return $this->belongsTo(FeeType::class, 'fee_type_id');
    }
}
