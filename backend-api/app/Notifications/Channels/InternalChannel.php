<?php

namespace App\Notifications\Channels;

use App\Models\InternalNotification;
use App\Models\User;
use Illuminate\Notifications\Notification;

/**
 * In-app ("in_app") channel.
 *
 * Persists an {@see InternalNotification} record for the recipient so it
 * surfaces in the admin notification center. InternalNotification rows are
 * keyed by user_id, so this channel only produces a record when the notifiable
 * is a User (staff). Guardians do not have admin accounts and reach the school
 * through email/SMS instead; for them this channel is a safe no-op.
 *
 * The notification must expose a toInternal() method returning an array with
 * at least a `type` and `title` (optionally `body`, `data`, `dedupe_key`).
 */
class InternalChannel
{
    public function send(mixed $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toInternal')) {
            return;
        }

        if (! $notifiable instanceof User) {
            return;
        }

        $payload = $notification->toInternal($notifiable);
        if (! is_array($payload) || empty($payload['title'])) {
            return;
        }

        $dedupeKey = $payload['dedupe_key'] ?? null;
        if ($dedupeKey !== null
            && InternalNotification::query()->where('dedupe_key', $dedupeKey)->exists()) {
            return;
        }

        InternalNotification::query()->create([
            'user_id' => (int) $notifiable->id,
            'type' => (string) ($payload['type'] ?? 'notification'),
            'title' => (string) $payload['title'],
            'body' => $payload['body'] ?? null,
            'data' => $payload['data'] ?? null,
            'dedupe_key' => $dedupeKey,
        ]);
    }
}
