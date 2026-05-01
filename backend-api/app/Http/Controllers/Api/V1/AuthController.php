<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\ChangePasswordRequest;
use App\Http\Requests\Api\V1\Auth\ForgotPasswordRequest;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Requests\Api\V1\Auth\ResetPasswordRequest;
use App\Http\Requests\Api\V1\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $login = trim((string) $request->validated('email'));

        /** @var User|null $user */
        $user = User::query()
            ->where('email', $login)
            ->orWhere('username', $login)
            ->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password_hash)) {
            return ApiResponse::error('Identifiants invalides.', [], 401);
        }

        if ($user->status !== 'active') {
            return ApiResponse::error('Ce compte n\'est pas actif.', [], 403);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $user->load(['role.permissions', 'userRolePermissions.permission']);

        $token = $user->createToken('api')->plainTextToken;

        return ApiResponse::success([
            'user' => (new UserResource($user->load('role')))->resolve(),
            'token' => $token,
            'token_type' => 'Bearer',
            'permission_codes' => $user->getEffectivePermissionCodes(),
        ], 'Connexion réussie.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return ApiResponse::success(null, 'Déconnexion réussie.');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load(['role.permissions', 'userRolePermissions.permission']);

        return ApiResponse::success([
            'user' => (new UserResource($user->load('role')))->resolve(),
            'permission_codes' => $user->getEffectivePermissionCodes(),
        ], 'Profil utilisateur.');
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->fill($request->validated());
        $user->save();

        return ApiResponse::success([
            'user' => (new UserResource($user->fresh()->load('role')))->resolve(),
            'permission_codes' => $user->getEffectivePermissionCodes(),
        ], 'Profil mis à jour.');
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($request->validated('current_password'), $user->password_hash)) {
            return ApiResponse::error('Le mot de passe actuel est incorrect.', [
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ], 422);
        }

        $user->password_hash = Hash::make($request->validated('password'));
        $user->save();

        $currentId = $user->currentAccessToken()?->id;
        if ($currentId) {
            $user->tokens()->where('id', '!=', $currentId)->delete();
        }

        return ApiResponse::success(null, 'Mot de passe modifié. Les autres sessions ont été déconnectées.');
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($request->validated());

        return ApiResponse::success(
            null,
            'Si cette adresse e-mail est enregistrée, vous recevrez la procédure de réinitialisation.'
        );
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->validated(),
            function (User $user, string $password) {
                $user->password_hash = Hash::make($password);
                $user->save();
                $user->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            $message = 'Impossible de réinitialiser le mot de passe. Le lien est invalide ou expiré.';

            return ApiResponse::error(
                $message,
                ['token' => [$message]],
                422
            );
        }

        return ApiResponse::success(null, 'Mot de passe réinitialisé. Vous pouvez vous connecter.');
    }
}
