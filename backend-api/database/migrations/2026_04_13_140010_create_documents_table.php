<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Guard: this project may already have a documents table in some environments
        if (Schema::hasTable('documents')) {
            return;
        }

        Schema::create('documents', function (Blueprint $table) {
            $table->id();

            $table->string('document_type', 50)->nullable()->index();
            $table->string('category', 50)->nullable()->index();
            $table->string('title', 255)->nullable();
            $table->text('description')->nullable();

            $table->string('file_name', 255)->nullable();
            $table->string('file_path', 500)->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();

            $table->unsignedBigInteger('student_id')->nullable()->index();
            $table->unsignedBigInteger('teacher_id')->nullable()->index();
            $table->unsignedBigInteger('invoice_id')->nullable()->index();
            $table->unsignedBigInteger('payment_id')->nullable()->index();
            $table->unsignedBigInteger('expense_id')->nullable()->index();

            $table->unsignedBigInteger('uploaded_by')->nullable()->index();
            $table->boolean('is_confidential')->default(false)->index();
            $table->string('visibility_scope', 50)->nullable();
            $table->string('status', 20)->default('active')->index();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};

