<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolesSeeder::class);
        $this->call(PermissionSeeder::class);
        $this->call(DemoUsersSeeder::class);
        $this->call(PaulBertDirectorDemoSeeder::class);
    }
}
