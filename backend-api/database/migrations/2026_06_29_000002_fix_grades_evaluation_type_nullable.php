<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('grades')) {
            return;
        }
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        $col = DB::selectOne("
            SELECT IS_NULLABLE, COLUMN_TYPE FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'grades'
              AND COLUMN_NAME = 'evaluation_type_id'
        ");

        if ($col && strtoupper($col->IS_NULLABLE) === 'NO') {
            DB::statement("ALTER TABLE grades MODIFY COLUMN `evaluation_type_id` BIGINT UNSIGNED NULL DEFAULT NULL");
        }

        $ws = DB::selectOne("
            SELECT COLUMN_TYPE FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'grades'
              AND COLUMN_NAME = 'weighted_score'
        ");
        if ($ws && strtolower($ws->COLUMN_TYPE) === 'decimal(8,2)') {
            DB::statement("ALTER TABLE grades MODIFY COLUMN `weighted_score` DECIMAL(8,4) DEFAULT NULL");
        }
    }

    public function down(): void {}
};
