<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    public const CHANNELS = ['email', 'sms', 'in_app'];

    public const CATEGORIES = [
        'absence',
        'late',
        'payment_reminder',
        'payment_received',
        'announcement',
        'report_card',
        'general',
    ];

    protected $fillable = [
        'user_id',
        'guardian_id',
        'channel',
        'category',
        'enabled',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class);
    }

    /**
     * Resolve the enabled channels for a given notifiable + category.
     *
     * When no preference rows exist for the owner (e.g. a freshly created
     * guardian), every channel is treated as enabled by default — matching the
     * seeded "all on" baseline.
     *
     * @return list<string> subset of self::CHANNELS
     */
    public static function enabledChannelsFor(Model $notifiable, string $category): array
    {
        [$column, $id] = self::ownerColumn($notifiable);
        if ($column === null) {
            return self::CHANNELS;
        }

        $rows = self::query()
            ->where($column, $id)
            ->where('category', $category)
            ->get();

        if ($rows->isEmpty()) {
            return self::CHANNELS;
        }

        $enabled = [];
        foreach (self::CHANNELS as $channel) {
            $row = $rows->firstWhere('channel', $channel);
            // Default to enabled when a specific channel row is missing.
            if ($row === null || (bool) $row->enabled) {
                $enabled[] = $channel;
            }
        }

        return $enabled;
    }

    /**
     * @return array{0: ?string, 1: ?int} [column, id]
     */
    public static function ownerColumn(Model $notifiable): array
    {
        if ($notifiable instanceof Guardian) {
            return ['guardian_id', (int) $notifiable->id];
        }
        if ($notifiable instanceof User) {
            return ['user_id', (int) $notifiable->id];
        }

        return [null, null];
    }
}
