<?php

namespace App\Models;

use Database\Seeders\PermissionSeeder;
use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements CanResetPasswordContract
{
    use CanResetPassword;
    use HasApiTokens;
    use Notifiable;

    protected $table = 'users';

    /** @var list<string>|null */
    protected ?array $effectivePermissionCodesCache = null;

    protected $fillable = [
        'role_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'username',
        'password_hash',
        'profile_photo',
        'gender',
        'date_of_birth',
        'address',
        'status',
        'last_login_at',
        'remember_token',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'last_login_at' => 'datetime',
            'date_of_birth' => 'date',
        ];
    }

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function teacher(): HasOne
    {
        return $this->hasOne(Teacher::class);
    }

    public function userRolePermissions(): HasMany
    {
        return $this->hasMany(UserRolePermission::class);
    }

    public function clearPermissionCache(): void
    {
        $this->effectivePermissionCodesCache = null;
    }

    public function isSuperAdmin(): bool
    {
        $this->loadMissing('role');

        return $this->role?->code === 'super_admin';
    }

    /**
     * @return list<string>
     */
    public function getEffectivePermissionCodes(): array
    {
        if ($this->effectivePermissionCodesCache !== null) {
            return $this->effectivePermissionCodesCache;
        }

        $this->loadMissing(['role.permissions', 'userRolePermissions.permission']);

        if ($this->isSuperAdmin()) {
            $codes = Permission::query()
                ->orderBy('code')
                ->pluck('code')
                ->values()
                ->all();

            if ($codes === []) {
                $codes = PermissionSeeder::allCodes();
                sort($codes);
            }

            $this->effectivePermissionCodesCache = $codes;

            return $this->effectivePermissionCodesCache;
        }

        $codes = collect($this->role?->permissions->pluck('code') ?? []);

        foreach ($this->userRolePermissions as $urp) {
            if (! $urp->relationLoaded('permission')) {
                $urp->load('permission');
            }
            $code = $urp->permission->code;
            if ($urp->is_allowed) {
                $codes->push($code);
            } else {
                $codes = $codes->reject(fn (string $c) => $c === $code)->values();
            }
        }

        $this->effectivePermissionCodesCache = $codes->unique()->values()->all();

        return $this->effectivePermissionCodesCache;
    }

    public function hasPermission(string $code): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return in_array($code, $this->getEffectivePermissionCodes(), true);
    }

    protected static function booted(): void
    {
        static::saved(function (User $user): void {
            $user->clearPermissionCache();
        });
    }
}
