<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('attendance_records')) {
            return;
        }

        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('school_year_id')->index();
            $table->unsignedBigInteger('term_id')->nullable()->index();
            $table->unsignedBigInteger('class_id')->index();
            $table->unsignedBigInteger('student_id')->index();
            $table->unsignedBigInteger('subject_id')->nullable()->index();
            $table->unsignedBigInteger('teacher_id')->nullable()->index();
            $table->unsignedBigInteger('schedule_entry_id')->nullable()->index();

            $table->date('attendance_date')->index();

            // present | absent | late
            $table->string('attendance_status', 20)->index();
            $table->unsignedSmallInteger('minutes_late')->nullable();

            $table->boolean('is_justified')->default(false)->index();
            $table->text('justification_note')->nullable();
            $table->timestamp('justified_at')->nullable();
            $table->unsignedBigInteger('justified_by')->nullable()->index();

            $table->unsignedBigInteger('marked_by')->nullable()->index();
            $table->text('remarks')->nullable();

            $table->timestamps();

            // Prevent duplicates when schedule_entry_id is present
            $table->unique(['student_id', 'schedule_entry_id', 'attendance_date'], 'att_unique_student_session_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};

