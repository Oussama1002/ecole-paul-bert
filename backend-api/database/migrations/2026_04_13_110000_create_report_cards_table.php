<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('report_cards')) {
            return;
        }

        Schema::create('report_cards', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('school_year_id')->index();
            $table->unsignedBigInteger('term_id')->nullable()->index();
            $table->unsignedBigInteger('evaluation_period_id')->index();
            $table->unsignedBigInteger('class_id')->index();
            $table->unsignedBigInteger('student_id')->index();

            $table->json('subject_averages')->nullable();
            $table->decimal('period_average', 6, 2)->nullable()->index();
            $table->integer('rank')->nullable()->index();
            $table->integer('rank_out_of')->nullable();

            $table->integer('absent_count')->default(0);
            $table->integer('late_count')->default(0);

            $table->string('status', 20)->default('draft')->index(); // draft|published|archived
            $table->timestamp('generated_at')->nullable();
            $table->unsignedBigInteger('generated_by')->nullable()->index();
            $table->timestamp('published_at')->nullable();
            $table->unsignedBigInteger('published_by')->nullable()->index();
            $table->timestamp('archived_at')->nullable();
            $table->unsignedBigInteger('archived_by')->nullable()->index();

            $table->string('pdf_path', 500)->nullable();

            $table->timestamps();

            $table->unique(
                ['evaluation_period_id', 'class_id', 'student_id'],
                'report_cards_unique_period_class_student'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_cards');
    }
};

