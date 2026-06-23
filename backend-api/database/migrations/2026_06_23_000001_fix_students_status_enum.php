<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('students')) {
            return;
        }
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        // 1) Convert status from ENUM to VARCHAR so new values ('archived' etc.)
        //    aren't silently truncated to an empty string.
        $col = DB::selectOne("
            SELECT COLUMN_TYPE FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'students'
              AND COLUMN_NAME = 'status'
        ");
        $type = strtolower((string) ($col->COLUMN_TYPE ?? ''));
        if (str_starts_with($type, 'enum') || str_starts_with($type, 'set')) {
            DB::statement("ALTER TABLE students MODIFY COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'pending'");
        }

        // 2) Recover students whose status was truncated to '' by previous failed
        //    archive attempts. They are almost certainly the ones the user
        //    intended to archive — restore that intent.
        DB::table('students')
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', '');
            })
            ->update(['status' => 'archived']);
    }

    public function down(): void {}
};
