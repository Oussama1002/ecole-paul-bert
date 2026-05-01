<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payments')) {
            DB::table('payments')->where('status', 'completed')->update(['status' => 'confirmed']);

            Schema::table('payments', function (Blueprint $table) {
                $table->string('status', 20)->default('confirmed')->change();
            });
        }

        if (Schema::hasTable('expenses') && ! Schema::hasColumn('expenses', 'cost_type')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->string('cost_type', 10)->default('variable')->after('amount')->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('expenses') && Schema::hasColumn('expenses', 'cost_type')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->dropColumn('cost_type');
            });
        }

        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->string('status', 20)->default('completed')->change();
            });
        }
    }
};
