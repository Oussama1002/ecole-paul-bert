<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('documents')) {
            return;
        }

        Schema::table('documents', function (Blueprint $table) {
            if (! Schema::hasColumn('documents', 'document_type'))   $table->string('document_type', 50)->nullable()->index();
            if (! Schema::hasColumn('documents', 'category'))        $table->string('category', 50)->nullable()->index();
            if (! Schema::hasColumn('documents', 'title'))           $table->string('title', 255)->nullable();
            if (! Schema::hasColumn('documents', 'description'))     $table->text('description')->nullable();
            if (! Schema::hasColumn('documents', 'file_name'))       $table->string('file_name', 255)->nullable();
            if (! Schema::hasColumn('documents', 'file_path'))       $table->string('file_path', 500)->nullable();
            if (! Schema::hasColumn('documents', 'mime_type'))       $table->string('mime_type', 100)->nullable();
            if (! Schema::hasColumn('documents', 'file_size'))       $table->unsignedBigInteger('file_size')->nullable();
            if (! Schema::hasColumn('documents', 'student_id'))      $table->unsignedBigInteger('student_id')->nullable()->index();
            if (! Schema::hasColumn('documents', 'teacher_id'))      $table->unsignedBigInteger('teacher_id')->nullable()->index();
            if (! Schema::hasColumn('documents', 'invoice_id'))      $table->unsignedBigInteger('invoice_id')->nullable()->index();
            if (! Schema::hasColumn('documents', 'payment_id'))      $table->unsignedBigInteger('payment_id')->nullable()->index();
            if (! Schema::hasColumn('documents', 'expense_id'))      $table->unsignedBigInteger('expense_id')->nullable()->index();
            if (! Schema::hasColumn('documents', 'uploaded_by'))     $table->unsignedBigInteger('uploaded_by')->nullable()->index();
            if (! Schema::hasColumn('documents', 'is_confidential')) $table->boolean('is_confidential')->default(false)->index();
            if (! Schema::hasColumn('documents', 'visibility_scope'))$table->string('visibility_scope', 50)->nullable();
            if (! Schema::hasColumn('documents', 'status'))          $table->string('status', 20)->default('active')->index();
            if (! Schema::hasColumn('documents', 'deleted_at'))      $table->softDeletes();
        });
    }

    public function down(): void {}
};
