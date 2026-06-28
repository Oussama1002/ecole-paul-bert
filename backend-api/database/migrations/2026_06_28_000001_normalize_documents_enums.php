<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('documents')) {
            return;
        }
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        // Belt-and-suspenders: convert every text column on documents to VARCHAR
        // so no value is ever silently truncated.
        $columns = [
            'category' => "VARCHAR(50) NULL DEFAULT NULL",
            'document_type' => "VARCHAR(50) NULL DEFAULT NULL",
            'status' => "VARCHAR(20) NOT NULL DEFAULT 'active'",
            'visibility_scope' => "VARCHAR(50) NULL DEFAULT NULL",
        ];

        foreach ($columns as $column => $definition) {
            if (! Schema::hasColumn('documents', $column)) {
                continue;
            }
            $col = DB::selectOne("
                SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'documents'
                  AND COLUMN_NAME = ?
            ", [$column]);
            $type = strtolower((string) ($col->COLUMN_TYPE ?? ''));
            if (str_starts_with($type, 'enum') || str_starts_with($type, 'set')) {
                DB::statement("ALTER TABLE documents MODIFY COLUMN `{$column}` {$definition}");
            }
        }
    }

    public function down(): void {}
};
