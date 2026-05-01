<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'action' => ['nullable', 'string', 'max:120'],
            'user_id' => ['nullable', 'integer'],
            'subject_type' => ['nullable', 'string', 'max:120'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = AuditLog::query()->with('user:id,first_name,last_name,email')->orderByDesc('id');

        if ($request->filled('action')) {
            $q->where('action', 'like', '%'.(string) $request->input('action').'%');
        }
        if ($request->filled('user_id')) {
            $q->where('user_id', (int) $request->input('user_id'));
        }
        if ($request->filled('subject_type')) {
            $q->where('subject_type', (string) $request->input('subject_type'));
        }
        if ($request->filled('from')) {
            $q->whereDate('created_at', '>=', (string) $request->input('from'));
        }
        if ($request->filled('to')) {
            $q->whereDate('created_at', '<=', (string) $request->input('to'));
        }

        $per = min((int) $request->input('per_page', 30), 100);
        $p = $q->paginate($per)->withQueryString();

        return ApiResponse::success([
            'items' => $p->getCollection()->map(fn (AuditLog $l) => [
                'id' => $l->id,
                'user_id' => $l->user_id,
                'user' => $l->user ? [
                    'id' => $l->user->id,
                    'first_name' => $l->user->first_name,
                    'last_name' => $l->user->last_name,
                    'email' => $l->user->email,
                ] : null,
                'action' => $l->action,
                'subject_type' => $l->subject_type,
                'subject_id' => $l->subject_id,
                'old_values' => $l->old_values,
                'new_values' => $l->new_values,
                'ip_address' => $l->ip_address,
                'created_at' => $l->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Journal d’audit.');
    }
}
