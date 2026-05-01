<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds 3 simple parent-phone slots directly on the student row. Purpose:
 * in simple-mode the school director captures 2–3 parent phones instantly
 * without going through the full Guardian CRUD. The existing guardians
 * table is untouched and still used in advanced mode.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('students')) {
            return;
        }

        Schema::table('students', function (Blueprint $table) {
            if (! Schema::hasColumn('students', 'parent_phone_1')) {
                $table->string('parent_phone_1', 30)->nullable()->after('emergency_contact_phone');
            }
            if (! Schema::hasColumn('students', 'parent_phone_2')) {
                $table->string('parent_phone_2', 30)->nullable()->after('parent_phone_1');
            }
            if (! Schema::hasColumn('students', 'parent_phone_3')) {
                $table->string('parent_phone_3', 30)->nullable()->after('parent_phone_2');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('students')) {
            return;
        }

        Schema::table('students', function (Blueprint $table) {
            foreach (['parent_phone_1', 'parent_phone_2', 'parent_phone_3'] as $col) {
                if (Schema::hasColumn('students', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
