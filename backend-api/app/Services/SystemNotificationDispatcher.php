<?php

namespace App\Services;

use App\Models\InternalNotification;
use App\Models\User;

class SystemNotificationDispatcher
{
    public function notifyUser(
        int $userId,
        string $type,
        string $title,
        ?string $body = null,
        ?array $data = null,
        ?string $dedupeKey = null
    ): void {
        if ($dedupeKey !== null) {
            $exists = InternalNotification::query()
                ->where('dedupe_key', $dedupeKey)
                ->exists();
            if ($exists) {
                return;
            }
        }

        InternalNotification::query()->create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'dedupe_key' => $dedupeKey,
        ]);
    }

    /**
     * @param  list<int>  $userIds
     */
    public function notifyUsers(array $userIds, string $type, string $title, ?string $body = null, ?array $data = null): void
    {
        foreach (array_unique($userIds) as $id) {
            $this->notifyUser((int) $id, $type, $title, $body, $data);
        }
    }

    public function notifyUsersWithPermission(
        string $permissionCode,
        string $type,
        string $title,
        ?string $body = null,
        ?array $data = null,
        ?int $exceptUserId = null
    ): void {
        $ids = User::query()
            ->where('status', 'active')
            ->get()
            ->filter(fn (User $u) => $u->hasPermission($permissionCode))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($exceptUserId !== null) {
            $ids = array_values(array_diff($ids, [$exceptUserId]));
        }

        $this->notifyUsers($ids, $type, $title, $body, $data);
    }
}
