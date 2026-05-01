<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

class AppSetting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'updated_by'];

    private const CACHE_TTL = 300; // 5 min

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $row = Cache::remember(
            "app_setting:$key",
            self::CACHE_TTL,
            fn () => self::where('key', $key)->first()
        );

        if (! $row) {
            return $default;
        }

        return self::castValue($row->value, $row->type);
    }

    public static function set(string $key, mixed $value, ?int $userId = null, string $type = 'string'): self
    {
        $stored = self::serialize($value, $type);

        $row = self::updateOrCreate(
            ['key' => $key],
            ['value' => $stored, 'type' => $type, 'updated_by' => $userId]
        );

        Cache::forget("app_setting:$key");

        return $row;
    }

    public static function all_public(): array
    {
        return self::all()->mapWithKeys(fn ($row) => [
            $row->key => self::castValue($row->value, $row->type),
        ])->toArray();
    }

    private static function castValue(?string $raw, string $type): mixed
    {
        if ($raw === null) {
            return null;
        }

        return match ($type) {
            'bool' => $raw === '1' || $raw === 'true',
            'int' => (int) $raw,
            'json' => json_decode($raw, true),
            default => $raw,
        };
    }

    private static function serialize(mixed $value, string $type): string
    {
        return match ($type) {
            'bool' => $value ? '1' : '0',
            'int' => (string) (int) $value,
            'json' => json_encode($value, JSON_UNESCAPED_UNICODE),
            default => (string) $value,
        };
    }
}
