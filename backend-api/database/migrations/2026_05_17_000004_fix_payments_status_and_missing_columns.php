<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payments')) {
            return;
        }

        Schema::table('payments', function (Blueprint $table) {
            // Add any missing columns
            if (! Schema::hasColumn('payments', 'transaction_reference')) {
                $table->string('transaction_reference', 100)->nullable();
            }
            if (! Schema::hasColumn('payments', 'received_by')) {
                $table->unsignedBigInteger('received_by')->nullable()->index();
            }
            if (! Schema::hasColumn('payments', 'note')) {
                $table->text('note')->nullable();
            }
            if (! Schema::hasColumn('payments', 'receipt_pdf_path')) {
                $table->string('receipt_pdf_path', 500)->nullable();
            }
            if (! Schema::hasColumn('payments', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->index();
            }
            if (! Schema::hasColumn('payments', 'cancelled_by')) {
                $table->unsignedBigInteger('cancelled_by')->nullable()->index();
            }
            if (! Schema::hasColumn('payments', 'cancel_reason')) {
                $table->text('cancel_reason')->nullable();
            }
        });

        // Convert status to VARCHAR(20) if it is ENUM (handles old server state)
        $driver = DB::connection()->getDriverName();
        if ($driver === 'mysql') {
            $col = DB::selectOne("
                SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'payments'
                  AND COLUMN_NAME = 'status'
            ");
            if ($col && str_starts_with(strtolower((string) ($col->COLUMN_TYPE ?? '')), 'enum')) {
                DB::statement("ALTER TABLE payments MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'confirmed'");
            }
        }

        // Normalise legacy 'completed' rows to 'confirmed'
        DB::table('payments')
            ->where('status', 'completed')
            ->update(['status' => 'confirmed']);
    }

    public function down(): void {}
};
