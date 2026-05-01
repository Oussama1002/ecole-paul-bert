<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('internal_notifications')) {
            return;
        }

        Schema::create('internal_notifications', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id')->index();
            $table->string('type', 50)->index();
            $table->string('title', 255);
            $table->text('body')->nullable();
            $table->json('data')->nullable();

            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();

            // Light anti-spam key for alerts (same type, same student, same period)
            $table->string('dedupe_key', 191)->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('internal_notifications');
    }
};

