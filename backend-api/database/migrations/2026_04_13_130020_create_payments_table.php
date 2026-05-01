<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payments')) {
            return;
        }

        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('student_id')->index();
            $table->unsignedBigInteger('invoice_id')->nullable()->index();
            $table->unsignedBigInteger('fee_assignment_id')->nullable()->index();
            $table->unsignedBigInteger('school_year_id')->index();

            $table->string('payment_reference', 50)->unique()->nullable();
            $table->date('payment_date')->index();
            $table->decimal('amount', 10, 2);
            $table->string('payment_method', 30)->default('cash')->index();
            $table->string('transaction_reference', 100)->nullable();
            $table->unsignedBigInteger('received_by')->nullable()->index();

            $table->string('status', 20)->default('completed')->index(); // completed|cancelled
            $table->text('note')->nullable();

            $table->timestamp('cancelled_at')->nullable()->index();
            $table->unsignedBigInteger('cancelled_by')->nullable()->index();
            $table->text('cancel_reason')->nullable();

            $table->string('receipt_pdf_path', 500)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};

