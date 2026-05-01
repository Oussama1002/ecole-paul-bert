<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Comptes de connexion pour le développement / démo.
 * Mot de passe par défaut (tous les comptes) : DevPaulBert2026!
 */
class DemoUsersSeeder extends Seeder
{
    private const DEFAULT_PASSWORD = 'DevPaulBert2026!';

    public function run(): void
    {
        if (! Role::query()->whereKey(1)->exists()) {
            $this->command?->warn('Aucun rôle en base : exécutez d’abord php artisan db:seed (ou au minimum RolesSeeder + PermissionSeeder).');

            return;
        }

        $password = Hash::make(self::DEFAULT_PASSWORD);

        $accounts = [
            [
                'email' => 'superadmin@paulbert.local',
                'username' => 'superadmin',
                'first_name' => 'Super',
                'last_name' => 'Administrateur',
                'role_id' => 1,
            ],
            [
                'email' => 'admin@paulbert.local',
                'username' => 'admin',
                'first_name' => 'Admin',
                'last_name' => 'Établissement',
                'role_id' => 2,
            ],
            [
                'email' => 'direction@paulbert.local',
                'username' => 'direction',
                'first_name' => 'Direction',
                'last_name' => 'Pédagogie',
                'role_id' => 3,
            ],
            [
                'email' => 'comptable@paulbert.local',
                'username' => 'comptable',
                'first_name' => 'Compta',
                'last_name' => 'Finance',
                'role_id' => 7,
            ],
            [
                'email' => 'enseignant@paulbert.local',
                'username' => 'enseignant',
                'first_name' => 'Jean',
                'last_name' => 'Professeur',
                'role_id' => 6,
            ],
        ];

        $now = now();

        foreach ($accounts as $row) {
            $payload = [
                'username' => $row['username'],
                'first_name' => $row['first_name'],
                'last_name' => $row['last_name'],
                'role_id' => $row['role_id'],
                'password_hash' => $password,
                'status' => 'active',
                'phone' => null,
                'updated_at' => $now,
            ];

            $existing = User::query()->where('email', $row['email'])->first();
            if ($existing) {
                $existing->fill($payload);
                $existing->save();
            } else {
                $nextId = (int) DB::table('users')->max('id') + 1;
                DB::table('users')->insert(array_merge($payload, [
                    'id' => $nextId,
                    'email' => $row['email'],
                    'created_at' => $now,
                ]));
            }
        }

        $this->command?->info('Comptes créés ou mis à jour (mot de passe : '.self::DEFAULT_PASSWORD.') :');
        foreach ($accounts as $row) {
            $this->command?->line('  • '.$row['email']);
        }
    }
}
