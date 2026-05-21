<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeeType extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'amount',
        'frequency',
        'start_date',
        'is_mandatory',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'is_mandatory' => 'boolean',
            'start_date' => 'date',
        ];
    }
}
