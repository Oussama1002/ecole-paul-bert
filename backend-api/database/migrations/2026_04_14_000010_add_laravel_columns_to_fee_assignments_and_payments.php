<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fee_assignments')) {
            Schema::table('fee_assignments', function (Blueprint $table) {
                if (! Schema::hasColumn('fee_assignments', 'cancelled_at')) {
                    $table->timestamp('cancelled_at')->nullable()->index();
                }
                if (! Schema::hasColumn('fee_assignments', 'cancelled_by')) {
                    $table->unsignedBigInteger('cancelled_by')->nullable()->index();
                }
                if (! Schema::hasColumn('fee_assignments', 'cancel_reason')) {
                    $table->text('cancel_reason')->nullable();
                }
            });
        }

        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                if (! Schema::hasColumn('payments', 'cancelled_at')) {
                    $table->timestamp('cancelled_at')->nullable()->index();
                }
                if (! Schema::hasColumn('payments', 'cancelled_by')) {
                    $table->unsignedBigInteger('cancelled_by')->nullable()->index();
                }
                if (! Schema::hasColumn('payments', 'cancel_reason')) {
                    $table->text('cancel_reason')->nullable();
                }
                if (! Schema::hasColumn('payments', 'receipt_pdf_path')) {
                    $table->string('receipt_pdf_path', 500)->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                foreach (['receipt_pdf_path', 'cancel_reason', 'cancelled_by', 'cancelled_at'] as $col) {
                    if (Schema::hasColumn('payments', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('fee_assignments')) {
            Schema::table('fee_assignments', function (Blueprint $table) {
                foreach (['cancel_reason', 'cancelled_by', 'cancelled_at'] as $col) {
                    if (Schema::hasColumn('fee_assignments', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
