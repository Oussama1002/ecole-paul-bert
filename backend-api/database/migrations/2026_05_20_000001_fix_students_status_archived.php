<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('students') || ! Schema::hasColumn('students', 'status')) {
            return;
        }

        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        $col = DB::selectOne("
            SELECT COLUMN_TYPE FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'students'
              AND COLUMN_NAME = 'status'
        ");

        $type = strtolower((string) ($col->COLUMN_TYPE ?? ''));
        if (! str_starts_with($type, 'enum') && ! str_starts_with($type, 'set')) {
            return;
        }

        // App uses `archived` (and other values); MySQL ENUM without it causes 500 on PATCH.
        DB::statement("ALTER TABLE students MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'");
    }

    public function down(): void {}
};
