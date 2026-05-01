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

        if (! Schema::hasColumn('announcements', 'published_by')) {
            Schema::table('announcements', function (Blueprint $table) {
                $table->unsignedBigInteger('published_by')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('announcements') && Schema::hasColumn('announcements', 'published_by')) {
            Schema::table('announcements', function (Blueprint $table) {
                $table->dropColumn('published_by');
            });
        }
    }
};
