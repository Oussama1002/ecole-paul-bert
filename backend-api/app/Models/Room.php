<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    protected $fillable = [
        'name',
        'code',
        'room_type',
        'capacity',
        'location',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
        ];
    }
}
