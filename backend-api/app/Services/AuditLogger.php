<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Request as RequestFacade;

class AuditLogger
{
    private const SENSITIVE_KEYS = ['password', 'password_hash', 'remember_token'];

    public function log(
        ?User $actor,
        string $action,
        ?Model $subject = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?Request $request = null
    ): void {
        $req = $request ?? RequestFacade::instance();

        AuditLog::query()->create([
            'user_id' => $actor?->id,
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'old_values' => $oldValues !== null ? $this->scrub($oldValues) : null,
            'new_values' => $newValues !== null ? $this->scrub($newValues) : null,
            'ip_address' => $req->ip(),
            'user_agent' => substr((string) $req->userAgent(), 0, 2000),
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function scrub(array $data): array
    {
        foreach (self::SENSITIVE_KEYS as $k) {
            if (array_key_exists($k, $data)) {
                $data[$k] = '***';
            }
        }

        return $data;
    }
}
