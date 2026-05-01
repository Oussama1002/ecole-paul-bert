<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subject extends Model
{
    protected $fillable = [
        'level_id',
        'name',
        'code',
        'description',
        'coefficient',
        'is_optional',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'coefficient' => 'decimal:2',
            'is_optional' => 'boolean',
        ];
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }
}
