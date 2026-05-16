<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('expenses', 'cost_type')) {
            return;
        }

        Schema::table('expenses', function (Blueprint $table) {
            $table->string('cost_type', 20)->default('variable')->after('vendor');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn('cost_type');
        });
    }
};
