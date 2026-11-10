<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NotificationPreferenceController extends Controller
{
    /**
     * Return the authenticated user's notification preferences as a full
     * category × channel matrix. Missing rows default to enabled, matching the
     * seeded "all on" baseline.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = (int) $user->id;

        $existing = NotificationPreference::query()
            ->where('user_id', $userId)
            ->get()
            ->keyBy(fn (NotificationPreference $p) => $p->category.'|'.$p->channel);

        $items = [];
        foreach (NotificationPreference::CATEGORIES as $category) {
            foreach (NotificationPreference::CHANNELS as $channel) {
                $row = $existing->get($category.'|'.$channel);
                $items[] = [
                    'category' => $category,
                    'channel' => $channel,
                    'enabled' => $row ? (bool) $row->enabled : true,
                ];
            }
        }

        return ApiResponse::success([
            'categories' => NotificationPreference::CATEGORIES,
            'channels' => NotificationPreference::CHANNELS,
            'preferences' => $items,
        ], 'Préférences de notification.');
    }

    /**
     * Bulk update preferences: [{ category, channel, enabled }].
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preferences' => ['required', 'array', 'min:1'],
            'preferences.*.category' => ['required', Rule::in(NotificationPreference::CATEGORIES)],
            'preferences.*.channel' => ['required', Rule::in(NotificationPreference::CHANNELS)],
            'preferences.*.enabled' => ['required', 'boolean'],
        ]);

        $userId = (int) $request->user()->id;

        foreach ($validated['preferences'] as $pref) {
            NotificationPreference::query()->updateOrCreate(
                [
                    'user_id' => $userId,
                    'guardian_id' => null,
                    'category' => $pref['category'],
                    'channel' => $pref['channel'],
                ],
                ['enabled' => (bool) $pref['enabled']]
            );
        }

        return $this->index($request);
    }
}
