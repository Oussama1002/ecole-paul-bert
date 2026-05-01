<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('students') && ! Schema::hasColumn('students', 'deleted_at')) {
            Schema::table('students', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        if (Schema::hasTable('student_guardians') && ! Schema::hasColumn('student_guardians', 'is_primary_contact')) {
            Schema::table('student_guardians', function (Blueprint $table) {
                $table->boolean('is_primary_contact')->default(false)->after('can_pickup_student');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('student_guardians') && Schema::hasColumn('student_guardians', 'is_primary_contact')) {
            Schema::table('student_guardians', function (Blueprint $table) {
                $table->dropColumn('is_primary_contact');
            });
        }

        if (Schema::hasTable('students') && Schema::hasColumn('students', 'deleted_at')) {
            Schema::table('students', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};
