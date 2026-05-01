<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\Role;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', \App\Models\User::class);

        $roles = Role::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return ApiResponse::success($roles, 'Rôles disponibles.');
    }
}
