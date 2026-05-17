<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->hasPermission('users.view');
    }

    public function view(User $actor, User $target): bool
    {
        if ($actor->id === $target->id) {
            return true;
        }

        return $actor->hasPermission('users.view');
    }

    public function create(User $actor): bool
    {
        return $actor->hasPermission('users.create');
    }

    public function update(User $actor, User $target): bool
    {
        return $actor->hasPermission('users.edit');
    }

    public function deactivate(User $actor, User $target): bool
    {
        if ($actor->id === $target->id) {
            return false;
        }

        return $actor->hasPermission('users.deactivate');
    }

    public function delete(User $actor, User $target): bool
    {
        if ($actor->id === $target->id) {
            return false;
        }

        return $actor->hasPermission('users.deactivate');
    }
}
