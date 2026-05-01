<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Expense extends Model
{
    protected $fillable = [
        'school_year_id',
        'expense_category_id',
        'expense_date',
        'amount',
        'cost_type',
        'vendor',
        'reference',
        'description',
        'status',
        'cancelled_at',
        'cancelled_by',
        'cancel_reason',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'expense_date' => 'date',
            'amount' => 'decimal:2',
            'cancelled_at' => 'datetime',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }
}

