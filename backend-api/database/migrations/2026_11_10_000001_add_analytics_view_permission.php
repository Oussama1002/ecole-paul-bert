<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Adds the `analytics.view` permission (multi-year analytics) and grants it to
 * Super Admin (1), Administrateur (2), Direction (3) and Scolarité (5).
 *
 * Mirrors the legacy-safe pattern used by PermissionSeeder: explicit PKs, since
 * some deployed schemas have no auto-increment on these tables.
 */
return new class extends Migration
{
    public function up(): void
    {
        $permission = DB::table('permissions')->where('code', 'analytics.view')->first();

        if ($permission === null) {
            $permissionId = (int) DB::table('permissions')->max('id') + 1;
            DB::table('permissions')->insert([
                'id' => $permissionId,
                'name' => 'Voir les analyses pluriannuelles',
                'code' => 'analytics.view',
                'module_name' => 'analytics',
                'action_name' => 'view',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $permissionId = (int) $permission->id;
        }

        $nextPivotId = (int) DB::table('role_permissions')->max('id') + 1;

        foreach ([1, 2, 3, 5] as $roleId) {
            $exists = DB::table('role_permissions')
                ->where('role_id', $roleId)
                ->where('permission_id', $permissionId)
                ->exists();

            if (! $exists) {
                DB::table('role_permissions')->insert([
                    'id' => $nextPivotId++,
                    'role_id' => $roleId,
                    'permission_id' => $permissionId,
                    'created_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        $permission = DB::table('permissions')->where('code', 'analytics.view')->first();

        if ($permission !== null) {
            DB::table('role_permissions')->where('permission_id', $permission->id)->delete();
            DB::table('permissions')->where('id', $permission->id)->delete();
        }
    }
};
