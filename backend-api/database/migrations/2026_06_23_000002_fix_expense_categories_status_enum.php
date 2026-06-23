<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('expense_categories')) {
            return;
        }
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        $col = DB::selectOne("
            SELECT COLUMN_TYPE FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'expense_categories'
              AND COLUMN_NAME = 'status'
        ");
        $type = strtolower((string) ($col->COLUMN_TYPE ?? ''));
        if (str_starts_with($type, 'enum') || str_starts_with($type, 'set')) {
            DB::statement("ALTER TABLE expense_categories MODIFY COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'active'");
        }

        // Recover any rows whose status was truncated to '' so they show in the form
        DB::table('expense_categories')
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', '');
            })
            ->update(['status' => 'active']);
    }

    public function down(): void {}
};
