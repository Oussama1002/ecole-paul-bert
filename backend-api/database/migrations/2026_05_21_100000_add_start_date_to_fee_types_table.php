<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('fee_types')) {
            return;
        }

        if (Schema::hasColumn('fee_types', 'start_date')) {
            return;
        }

        Schema::table('fee_types', function (Blueprint $table) {
            $table->date('start_date')->nullable()->after('frequency');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('fee_types') || ! Schema::hasColumn('fee_types', 'start_date')) {
            return;
        }

        Schema::table('fee_types', function (Blueprint $table) {
            $table->dropColumn('start_date');
        });
    }
};
