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

        // Controller saves the row before the file is stored, then fills these
        // columns on a second save — so they must be nullable.
        $targets = [
            'file_name'   => "VARCHAR(255) NULL DEFAULT NULL",
            'file_path'   => "VARCHAR(500) NULL DEFAULT NULL",
            'mime_type'   => "VARCHAR(100) NULL DEFAULT NULL",
            'file_size'   => "BIGINT UNSIGNED NULL DEFAULT NULL",
            'title'       => "VARCHAR(255) NULL DEFAULT NULL",
            'description' => "TEXT NULL DEFAULT NULL",
        ];

        foreach ($targets as $column => $definition) {
            if (Schema::hasColumn('documents', $column)) {
                DB::statement("ALTER TABLE documents MODIFY COLUMN `{$column}` {$definition}");
            }
        }
    }

    public function down(): void {}
};
