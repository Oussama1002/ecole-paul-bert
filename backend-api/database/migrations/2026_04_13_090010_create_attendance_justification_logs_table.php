<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('attendance_justification_logs')) {
            return;
        }

        Schema::create('attendance_justification_logs', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('attendance_record_id')->index();
            $table->boolean('new_is_justified');
            $table->text('note')->nullable();
            $table->timestamp('justified_at')->nullable();
            $table->unsignedBigInteger('validated_by')->nullable()->index();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_justification_logs');
    }
};

