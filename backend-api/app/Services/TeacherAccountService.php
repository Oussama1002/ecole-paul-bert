<?php

namespace App\Services;

use App\Models\Role;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TeacherAccountService
{
    public function ensureUserAccount(Teacher $teacher): User
    {
        if ($teacher->user_id !== null) {
            $existing = User::query()->find($teacher->user_id);
            if ($existing) {
                return $existing;
            }
        }

        $roleId = Role::query()->where('code', 'teacher')->value('id');
        if ($roleId === null) {
            throw new \RuntimeException('Rôle enseignant introuvable.');
        }

        $email = filled($teacher->email)
            ? (string) $teacher->email
            : $this->generateEmail($teacher);

        $user = User::query()->create([
            'role_id' => (int) $roleId,
            'first_name' => $teacher->first_name,
            'last_name' => $teacher->last_name,
            'email' => $email,
            'phone' => $teacher->phone,
            'username' => $this->generateUsername($teacher),
            'password_hash' => Hash::make(Str::password(16)),
            'gender' => $teacher->gender,
            'date_of_birth' => $teacher->date_of_birth,
            'address' => $teacher->address,
            'status' => 'active',
        ]);

        $user->clearPermissionCache();
        $teacher->forceFill(['user_id' => $user->id])->save();

        return $user;
    }

    private function generateEmail(Teacher $teacher): string
    {
        $local = Str::slug((string) $teacher->employee_code, '')
            ?: Str::slug("{$teacher->first_name}.{$teacher->last_name}", '');
        $local = $local !== '' ? Str::lower($local) : 'enseignant';

        $email = "{$local}@paulbert.local";
        $n = 1;
        while (User::query()->where('email', $email)->exists()) {
            $n++;
            $email = "{$local}{$n}@paulbert.local";
        }

        return $email;
    }

    private function generateUsername(Teacher $teacher): string
    {
        $base = Str::lower(Str::slug((string) $teacher->employee_code, ''))
            ?: Str::lower(Str::slug("{$teacher->first_name}.{$teacher->last_name}", ''));
        $base = $base !== '' ? $base : 'enseignant';

        $username = $base;
        $n = 1;
        while (User::query()->where('username', $username)->exists()) {
            $n++;
            $username = $base.$n;
        }

        return $username;
    }
}
