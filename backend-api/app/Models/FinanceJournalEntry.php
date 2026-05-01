<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FinanceJournalEntry extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPES = ['income', 'expense'];
    public const COST_TYPES = ['fixed', 'variable'];

    protected $fillable = [
        'entry_date',
        'entry_type',
        'cost_type',
        'category',
        'label',
        'amount',
        'note',
        'attachment_path',
        'attachment_name',
        'attachment_mime',
        'attachment_size',
        'created_by',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'amount' => 'decimal:2',
    ];
}
