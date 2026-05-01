<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('teacher_attendances')) {
            return;
        }

        Schema::create('teacher_attendances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('teacher_id')->index();
            $table->date('attendance_date')->index();
            // present | absent | late
            $table->string('status', 20)->index();
            $table->unsignedSmallInteger('minutes_late')->nullable();
            $table->text('reason')->nullable();
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->timestamps();

            $table->unique(['teacher_id', 'attendance_date'], 'teacher_att_unique_day');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_attendances');
    }
};
