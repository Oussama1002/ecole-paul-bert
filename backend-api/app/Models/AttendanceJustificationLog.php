<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceJustificationLog extends Model
{
    protected $fillable = [
        'attendance_record_id',
        'new_is_justified',
        'note',
        'justified_at',
        'validated_by',
    ];

    protected function casts(): array
    {
        return [
            'new_is_justified' => 'boolean',
            'justified_at' => 'datetime',
        ];
    }

    public function attendanceRecord(): BelongsTo
    {
        return $this->belongsTo(AttendanceRecord::class);
    }
}

