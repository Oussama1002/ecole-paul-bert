<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('class_school_year') || ! Schema::hasTable('classes')) {
            return;
        }

        $yearIds = DB::table('school_years')->orderBy('start_date')->pluck('id')->all();
        if ($yearIds === []) {
            return;
        }

        $classIds = DB::table('classes')->pluck('id')->all();
        foreach ($classIds as $classId) {
            foreach ($yearIds as $yearId) {
                DB::table('class_school_year')->insertOrIgnore([
                    'class_id' => $classId,
                    'school_year_id' => $yearId,
                ]);
            }
        }

        if (Schema::hasColumn('classes', 'school_year_id')) {
            DB::table('classes')->whereNotNull('school_year_id')->update(['school_year_id' => null]);
        }
    }

    public function down(): void
    {
        // Data backfill — no rollback.
    }
};
