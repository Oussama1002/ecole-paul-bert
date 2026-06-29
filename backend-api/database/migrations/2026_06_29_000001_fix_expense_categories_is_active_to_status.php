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

        if (Schema::hasColumn('expense_categories', 'is_active') && ! Schema::hasColumn('expense_categories', 'status')) {
            Schema::table('expense_categories', function ($table) {
                $table->string('status', 20)->default('active')->after('code');
            });

            DB::table('expense_categories')
                ->where('is_active', true)
                ->update(['status' => 'active']);

            DB::table('expense_categories')
                ->where('is_active', false)
                ->update(['status' => 'inactive']);

            Schema::table('expense_categories', function ($table) {
                $table->dropColumn('is_active');
            });
        }

        DB::table('expense_categories')
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', '');
            })
            ->update(['status' => 'active']);
    }

    public function down(): void {}
};
