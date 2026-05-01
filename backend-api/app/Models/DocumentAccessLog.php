<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Schema;

class DocumentAccessLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'document_id',
        'user_id',
        // v1 schema (created by Laravel migration)
        'action',
        'ip',
        'user_agent',
        'created_at',
        // base SQL schema (paulbert_base_structure.sql)
        'action_type',
        'ip_address',
        'accessed_at',
    ];

    private static ?array $columnSupport = null;

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'accessed_at' => 'datetime',
        ];
    }

    /**
     * Write an access log row without unknown-column errors across schema variants.
     */
    public static function writeAccess(
        int $documentId,
        ?int $userId,
        string $action,
        ?string $ip,
        ?string $userAgent,
        ?\DateTimeInterface $at = null
    ): void {
        $at = $at ?? now();
        $support = self::resolveColumnSupport();
        $payload = self::buildAccessPayloadForSupportedColumns(
            $support,
            $documentId,
            $userId,
            $action,
            $ip,
            $userAgent,
            $at
        );

        self::query()->create($payload);
    }

    /**
     * Pure helper (unit-testable): build the insert payload given supported columns.
     *
     * @param  array{action: bool, ip: bool, created_at: bool, action_type: bool, ip_address: bool, accessed_at: bool, user_agent: bool}  $support
     * @return array<string, mixed>
     */
    public static function buildAccessPayloadForSupportedColumns(
        array $support,
        int $documentId,
        ?int $userId,
        string $action,
        ?string $ip,
        ?string $userAgent,
        \DateTimeInterface $at
    ): array {
        $payload = [
            'document_id' => $documentId,
            'user_id' => $userId,
        ];

        if ($support['action_type']) $payload['action_type'] = $action;
        if ($support['ip_address']) $payload['ip_address'] = $ip;
        if ($support['accessed_at']) $payload['accessed_at'] = $at;

        if ($support['action']) $payload['action'] = $action;
        if ($support['ip']) $payload['ip'] = $ip;
        if ($support['created_at']) $payload['created_at'] = $at;

        if ($support['user_agent']) $payload['user_agent'] = $userAgent;

        // Keep nullable columns (prevents noisy array_filter surprises)
        return $payload;
    }

    /**
     * @return array{action: bool, ip: bool, created_at: bool, action_type: bool, ip_address: bool, accessed_at: bool, user_agent: bool}
     */
    private static function resolveColumnSupport(): array
    {
        if (self::$columnSupport !== null) {
            return self::$columnSupport;
        }

        $table = (new self())->getTable();

        // Favor the "real DB" base schema, but support both.
        self::$columnSupport = [
            'action' => Schema::hasColumn($table, 'action'),
            'ip' => Schema::hasColumn($table, 'ip'),
            'created_at' => Schema::hasColumn($table, 'created_at'),
            'action_type' => Schema::hasColumn($table, 'action_type'),
            'ip_address' => Schema::hasColumn($table, 'ip_address'),
            'accessed_at' => Schema::hasColumn($table, 'accessed_at'),
            'user_agent' => Schema::hasColumn($table, 'user_agent'),
        ];

        return self::$columnSupport;
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}

