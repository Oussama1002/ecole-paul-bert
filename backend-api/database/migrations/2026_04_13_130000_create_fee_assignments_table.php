<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fee_assignments')) {
            return;
        }

        Schema::create('fee_assignments', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('student_id')->index();
            $table->unsignedBigInteger('school_year_id')->index();
            $table->unsignedBigInteger('fee_type_id')->index();

            $table->decimal('amount_due', 10, 2)->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('scholarship_amount', 10, 2)->default(0);

            $table->decimal('amount_paid', 10, 2)->default(0);
            $table->decimal('balance', 10, 2)->default(0);

            $table->date('due_date')->nullable()->index();
            $table->string('status', 20)->default('unpaid')->index(); // unpaid|partial|paid|cancelled
            $table->text('notes')->nullable();

            $table->timestamp('cancelled_at')->nullable()->index();
            $table->unsignedBigInteger('cancelled_by')->nullable()->index();
            $table->text('cancel_reason')->nullable();

            $table->unsignedBigInteger('created_by')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_assignments');
    }
};

