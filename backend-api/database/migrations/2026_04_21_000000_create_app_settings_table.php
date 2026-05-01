<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('app_settings')) {
            // The legacy `users` table in this deployment does not always expose a
            // PRIMARY KEY on `id`, so we cannot create a real foreign key. We keep
            // the column as a plain unsigned bigint to stay portable across the
            // strict/refreshed and the legacy schema.
            Schema::create('app_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key', 120)->unique();
                $table->text('value')->nullable();
                $table->string('type', 20)->default('string'); // string|bool|int|json
                $table->unsignedBigInteger('updated_by')->nullable();
                $table->timestamps();
            });
        }

        // Seed simple mode ON by default — the client wants simple as the default experience.
        DB::table('app_settings')->updateOrInsert(
            ['key' => 'simple_mode_enabled'],
            ['value' => '1', 'type' => 'bool', 'updated_at' => now(), 'created_at' => now()]
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
