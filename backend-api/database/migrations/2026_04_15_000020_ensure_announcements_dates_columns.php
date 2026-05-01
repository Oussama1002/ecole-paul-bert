<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('announcements')) {
            return;
        }

        Schema::table('announcements', function (Blueprint $table) {
            if (! Schema::hasColumn('announcements', 'start_date')) {
                $table->date('start_date')->nullable();
            }
            if (! Schema::hasColumn('announcements', 'end_date')) {
                $table->date('end_date')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('announcements')) {
            return;
        }

        Schema::table('announcements', function (Blueprint $table) {
            if (Schema::hasColumn('announcements', 'end_date')) {
                $table->dropColumn('end_date');
            }
            if (Schema::hasColumn('announcements', 'start_date')) {
                $table->dropColumn('start_date');
            }
        });
    }
};

