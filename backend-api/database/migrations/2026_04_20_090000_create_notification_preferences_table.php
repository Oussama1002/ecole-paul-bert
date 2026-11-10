<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('notification_preferences')) {
            return;
        }

        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();

            // Exactly one of user_id (staff) / guardian_id (parent) is set.
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->unsignedBigInteger('guardian_id')->nullable()->index();

            $table->enum('channel', ['email', 'sms', 'in_app']);
            $table->enum('category', [
                'absence',
                'late',
                'payment_reminder',
                'payment_received',
                'announcement',
                'report_card',
                'general',
            ]);

            $table->boolean('enabled')->default(true);

            $table->timestamps();

            $table->unique(
                ['user_id', 'guardian_id', 'category', 'channel'],
                'notification_preferences_unique_owner_cat_channel'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};
