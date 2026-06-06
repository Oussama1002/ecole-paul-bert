<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('levels') || Schema::hasColumn('levels', 'status')) {
            return;
        }

        Schema::table('levels', function (Blueprint $table) {
            $table->string('status', 20)->default('active')->after('sort_order');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('levels', 'status')) {
            return;
        }

        Schema::table('levels', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
