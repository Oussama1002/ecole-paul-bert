<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('invoice_items')) {
            Schema::create('invoice_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('invoice_id')->index();
                $table->unsignedBigInteger('fee_assignment_id')->nullable()->index();
                $table->string('label', 255);
                $table->decimal('amount', 10, 2);
                $table->timestamps();
            });
        }

        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                if (! Schema::hasColumn('invoices', 'cancelled_at')) {
                    $table->timestamp('cancelled_at')->nullable()->index();
                }
                if (! Schema::hasColumn('invoices', 'cancelled_by')) {
                    $table->unsignedBigInteger('cancelled_by')->nullable()->index();
                }
                if (! Schema::hasColumn('invoices', 'cancel_reason')) {
                    $table->text('cancel_reason')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');

        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                if (Schema::hasColumn('invoices', 'cancel_reason')) {
                    $table->dropColumn('cancel_reason');
                }
                if (Schema::hasColumn('invoices', 'cancelled_by')) {
                    $table->dropColumn('cancelled_by');
                }
                if (Schema::hasColumn('invoices', 'cancelled_at')) {
                    $table->dropColumn('cancelled_at');
                }
            });
        }
    }
};
