<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'student_id',
        'invoice_id',
        'fee_assignment_id',
        'school_year_id',
        'payment_reference',
        'payment_date',
        'amount',
        'payment_method',
        'transaction_reference',
        'received_by',
        'status',
        'note',
        'cancelled_at',
        'cancelled_by',
        'cancel_reason',
        'receipt_pdf_path',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'amount' => 'decimal:2',
            'cancelled_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function feeAssignment(): BelongsTo
    {
        return $this->belongsTo(FeeAssignment::class);
    }
}
