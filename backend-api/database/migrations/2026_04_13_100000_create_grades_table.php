<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('grades')) {
            return;
        }

        Schema::create('grades', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('school_year_id')->index();
            $table->unsignedBigInteger('term_id')->nullable()->index();
            $table->unsignedBigInteger('evaluation_period_id')->index();
            $table->unsignedBigInteger('evaluation_type_id')->nullable()->index();
            $table->unsignedBigInteger('class_id')->index();
            $table->unsignedBigInteger('student_id')->index();
            $table->unsignedBigInteger('subject_id')->index();
            $table->unsignedBigInteger('teacher_id')->nullable()->index();

            $table->decimal('score', 6, 2);
            $table->decimal('max_score', 6, 2)->default(20);
            $table->decimal('weighted_score', 8, 4)->nullable();
            $table->decimal('coefficient', 6, 2)->default(1);

            $table->text('appreciation')->nullable();

            $table->boolean('is_validated')->default(false)->index();
            $table->timestamp('validated_at')->nullable();
            $table->unsignedBigInteger('validated_by')->nullable()->index();
            $table->unsignedBigInteger('entered_by')->nullable()->index();

            $table->timestamps();

            // One note per student/subject/evaluation period (can be extended later with evaluation_type_id)
            $table->unique(
                ['evaluation_period_id', 'class_id', 'student_id', 'subject_id'],
                'grades_unique_period_class_student_subject'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};

