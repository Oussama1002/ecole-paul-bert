<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('notification_logs')) {
            return;
        }

        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();

            // Polymorphic recipient: Guardian or User.
            $table->string('notifiable_type');
            $table->unsignedBigInteger('notifiable_id');

            $table->string('notification_type'); // Notification class name
            $table->enum('channel', ['email', 'sms', 'in_app'])->index();
            $table->enum('status', ['pending', 'sent', 'failed'])->default('pending')->index();

            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();

            $table->timestamps();

            $table->index(['notifiable_type', 'notifiable_id'], 'notification_logs_notifiable_index');
            $table->index(['notification_type', 'created_at'], 'notification_logs_type_date_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
    }
};
