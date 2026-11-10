<?php

namespace Database\Seeders;

use App\Models\Guardian;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds a default "all channels enabled for all categories" baseline for every
 * existing guardian and user. Idempotent: owners that already have at least one
 * preference row are skipped.
 */
class NotificationPreferenceSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        User::query()->select('id')->orderBy('id')->chunk(200, function ($users) use ($now) {
            foreach ($users as $user) {
                $this->seedOwner('user_id', (int) $user->id, $now);
            }
        });

        Guardian::query()->select('id')->orderBy('id')->chunk(200, function ($guardians) use ($now) {
            foreach ($guardians as $guardian) {
                $this->seedOwner('guardian_id', (int) $guardian->id, $now);
            }
        });
    }

    private function seedOwner(string $column, int $id, $now): void
    {
        $exists = NotificationPreference::query()->where($column, $id)->exists();
        if ($exists) {
            return;
        }

        $rows = [];
        foreach (NotificationPreference::CATEGORIES as $category) {
            foreach (NotificationPreference::CHANNELS as $channel) {
                $rows[] = [
                    'user_id' => $column === 'user_id' ? $id : null,
                    'guardian_id' => $column === 'guardian_id' ? $id : null,
                    'category' => $category,
                    'channel' => $channel,
                    'enabled' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::table('notification_preferences')->insert($rows);
    }
}
