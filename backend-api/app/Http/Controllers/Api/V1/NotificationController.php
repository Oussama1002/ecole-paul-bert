<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Guardian;
use App\Models\NotificationLog;
use App\Models\User;
use App\Notifications\TestNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

class NotificationController extends Controller
{
    /**
     * Paginated list of notification delivery logs (admin, notifications.view).
     */
    public function logs(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', 'in:pending,sent,failed'],
            'channel' => ['nullable', 'in:email,sms,in_app'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = NotificationLog::query()->orderByDesc('id');

        if ($status = $request->input('status')) {
            $q->where('status', $status);
        }
        if ($channel = $request->input('channel')) {
            $q->where('channel', $channel);
        }
        if ($from = $request->input('from')) {
            $q->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->input('to')) {
            $q->whereDate('created_at', '<=', $to);
        }

        $p = $q->paginate(min((int) $request->input('per_page', 30), 100))->withQueryString();

        $recipients = $this->resolveRecipients($p->getCollection());

        return ApiResponse::success([
            'items' => $p->getCollection()->map(fn (NotificationLog $log) => [
                'id' => $log->id,
                'notifiable_type' => class_basename($log->notifiable_type),
                'notifiable_id' => (int) $log->notifiable_id,
                'recipient' => $recipients[$log->notifiable_type.'|'.$log->notifiable_id] ?? null,
                'notification_type' => class_basename($log->notification_type),
                'channel' => $log->channel,
                'status' => $log->status,
                'error_message' => $log->error_message,
                'sent_at' => $log->sent_at?->toIso8601String(),
                'created_at' => $log->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Journal des notifications.');
    }

    /**
     * Send a test notification to the authenticated admin, to verify that the
     * email / SMS configuration works end to end.
     */
    public function test(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $channels = [];
        if (! empty($user->email)) {
            $channels[] = 'email';
        }
        if (! empty($user->routeNotificationForSms())) {
            $channels[] = 'sms';
        }
        $channels[] = 'in_app';

        try {
            Notification::send($user, new TestNotification());
        } catch (\Throwable $e) {
            return ApiResponse::error(
                "Échec de l'envoi du test : ".$e->getMessage(),
                [],
                500
            );
        }

        return ApiResponse::success([
            'channels' => $channels,
            'email' => $user->email,
            'phone' => $user->routeNotificationForSms(),
            'queued' => (string) config('queue.default') !== 'sync',
        ], 'Notification de test envoyée. Vérifiez vos canaux (e-mail, SMS, notifications).');
    }

    /**
     * Resolve recipient display names for a page of logs without N+1 queries.
     *
     * @param  \Illuminate\Support\Collection<int, NotificationLog>  $logs
     * @return array<string, string>
     */
    private function resolveRecipients($logs): array
    {
        $byType = [];
        foreach ($logs as $log) {
            $byType[$log->notifiable_type][] = (int) $log->notifiable_id;
        }

        $names = [];
        foreach ($byType as $type => $ids) {
            $ids = array_values(array_unique($ids));
            if ($type === Guardian::class) {
                Guardian::query()->whereIn('id', $ids)->get(['id', 'first_name', 'last_name'])
                    ->each(function (Guardian $g) use (&$names, $type) {
                        $names[$type.'|'.$g->id] = trim($g->first_name.' '.$g->last_name);
                    });
            } elseif ($type === User::class) {
                User::query()->whereIn('id', $ids)->get(['id', 'first_name', 'last_name'])
                    ->each(function (User $u) use (&$names, $type) {
                        $names[$type.'|'.$u->id] = trim($u->first_name.' '.$u->last_name);
                    });
            }
        }

        return $names;
    }
}
