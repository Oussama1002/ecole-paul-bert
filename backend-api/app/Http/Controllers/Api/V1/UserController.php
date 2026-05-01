<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\User\IndexUserRequest;
use App\Http\Requests\Api\V1\User\StoreUserRequest;
use App\Http\Requests\Api\V1\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function __construct(
        private AuditLogger $audit
    ) {}
    public function index(IndexUserRequest $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $query = User::query()->with('role');

        if ($search = $request->validated('search')) {
            $term = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(email) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(first_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$term]);
            });
        }

        if ($roleId = $request->validated('role_id')) {
            $query->where('role_id', $roleId);
        }

        if ($status = $request->validated('status')) {
            $query->where('status', $status);
        }

        $sortBy = $request->validated('sort_by');
        $sortOrder = $request->validated('sort_order');
        $query->orderBy($sortBy, $sortOrder);

        $paginator = $query->paginate((int) $request->validated('per_page'))->withQueryString();

        return ApiResponse::success([
            'items' => UserResource::collection($paginator->getCollection())
                ->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Liste des utilisateurs.');
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return ApiResponse::success(
            (new UserResource($user->load('role')))->resolve(),
            'Détail utilisateur.'
        );
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $data = $request->validated();
        $data['password_hash'] = Hash::make($data['password']);
        unset($data['password']);
        $data['status'] = $data['status'] ?? 'active';

        $user = User::query()->create($data);
        $user->clearPermissionCache();

        $this->audit->log(
            $request->user(),
            'user.created',
            $user,
            null,
            $user->only(['email', 'first_name', 'last_name', 'role_id', 'status', 'username'])
        );

        return ApiResponse::success(
            (new UserResource($user->load('role')))->resolve(),
            'Utilisateur créé.',
            201
        );
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        if ($request->has('status') && (string) $request->input('status') !== (string) $user->status) {
            if (in_array($request->input('status'), ['inactive', 'suspended'], true)) {
                $this->authorize('deactivate', $user);
            }
        }

        $data = $request->validated();

        if (! empty($data['password'])) {
            $data['password_hash'] = Hash::make($data['password']);
            $user->tokens()->delete();
        }
        unset($data['password']);

        $before = $user->getAttributes();

        $user->fill($data);
        $user->save();
        $user->clearPermissionCache();

        $changes = $user->getChanges();
        if ($changes !== []) {
            $this->audit->log(
                $request->user(),
                'user.updated',
                $user,
                array_intersect_key($before, array_flip(array_keys($changes))),
                $changes
            );
            if (array_key_exists('role_id', $changes)) {
                $this->audit->log(
                    $request->user(),
                    'user.role_changed',
                    $user,
                    ['role_id' => $before['role_id'] ?? null],
                    ['role_id' => $changes['role_id']]
                );
            }
        }

        return ApiResponse::success(
            (new UserResource($user->fresh()->load('role')))->resolve(),
            'Utilisateur mis à jour.'
        );
    }
}
