<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\InternalNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternalNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'unread_only' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $userId = $request->user()?->id;
        if (! $userId) {
            return ApiResponse::error('Non authentifié.', [], 401);
        }

        $q = InternalNotification::query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at');

        if ($request->boolean('unread_only')) {
            $q->whereNull('read_at');
        }

        $perPage = min((int) $request->input('per_page', 30), 100);
        $p = $q->paginate($perPage)->withQueryString();

        return ApiResponse::success([
            'items' => $p->getCollection()->map(fn (InternalNotification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->title,
                'body' => $n->body,
                'data' => $n->data,
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Notifications.');
    }

    public function markRead(InternalNotification $internalNotification, Request $request): JsonResponse
    {
        $userId = $request->user()?->id;
        if (! $userId || (int) $internalNotification->user_id !== (int) $userId) {
            return ApiResponse::error('Accès refusé.', [], 403);
        }

        if ($internalNotification->read_at === null) {
            $internalNotification->read_at = now();
            $internalNotification->save();
        }

        return ApiResponse::success(null, 'Notification lue.');
    }

    public function indicators(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;
        if (! $userId) {
            return ApiResponse::error('Non authentifié.', [], 401);
        }

        $unread = InternalNotification::query()
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->count();

        return ApiResponse::success([
            'unread_notifications' => (int) $unread,
        ], 'Indicateurs.');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;
        if (! $userId) {
            return ApiResponse::error('Non authentifié.', [], 401);
        }

        InternalNotification::query()
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return ApiResponse::success(null, 'Toutes les notifications sont marquées comme lues.');
    }
}

