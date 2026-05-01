<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('expenses')) {
            return;
        }

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('school_year_id')->nullable()->index();
            $table->unsignedBigInteger('expense_category_id')->index();

            $table->date('expense_date')->index();
            $table->decimal('amount', 10, 2);
            $table->string('vendor', 150)->nullable();
            $table->string('reference', 100)->nullable()->index();
            $table->text('description')->nullable();

            $table->string('status', 20)->default('active')->index(); // active|cancelled
            $table->timestamp('cancelled_at')->nullable()->index();
            $table->unsignedBigInteger('cancelled_by')->nullable()->index();
            $table->text('cancel_reason')->nullable();

            $table->unsignedBigInteger('created_by')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};

