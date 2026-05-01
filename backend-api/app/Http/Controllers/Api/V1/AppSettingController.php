<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\AppSetting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppSettingController extends Controller
{
    public function __construct(
        private AuditLogger $audit
    ) {}

    /**
     * Public-to-authenticated read: every logged-in user needs to know the current
     * simple_mode flag to render the right sidebar.
     */
    public function index(): JsonResponse
    {
        return ApiResponse::success([
            'simple_mode_enabled' => (bool) AppSetting::get('simple_mode_enabled', true),
        ], 'Paramètres applicatifs.');
    }

    /**
     * Admin-only write. Kept inline (no new permission) to stay minimal; the
     * RBAC audit recommends promoting this to a dedicated `app_settings.manage`
     * permission when we have a larger settings module.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->loadMissing('role');

        $isAdmin = $user->isSuperAdmin() || in_array($user->role?->code, ['admin'], true);
        if (! $isAdmin) {
            return ApiResponse::error('Accès refusé.', [], 403);
        }

        $data = $request->validate([
            'simple_mode_enabled' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('simple_mode_enabled', $data)) {
            $before = (bool) AppSetting::get('simple_mode_enabled', true);
            AppSetting::set('simple_mode_enabled', (bool) $data['simple_mode_enabled'], $user->id, 'bool');
            $this->audit->log(
                $user,
                'settings.updated',
                null,
                ['simple_mode_enabled' => $before],
                ['simple_mode_enabled' => (bool) $data['simple_mode_enabled']]
            );
        }

        return $this->index();
    }
}
