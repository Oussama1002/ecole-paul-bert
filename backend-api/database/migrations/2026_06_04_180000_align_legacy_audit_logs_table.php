<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Align audit_logs after import from paulbert_base.sql (legacy table_name/record_id).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        Schema::table('audit_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('audit_logs', 'subject_type')) {
                $table->string('subject_type', 120)->nullable()->after('action');
            }
            if (! Schema::hasColumn('audit_logs', 'subject_id')) {
                $table->unsignedBigInteger('subject_id')->nullable()->after('subject_type');
            }
            if (Schema::hasColumn('audit_logs', 'table_name')) {
                $table->string('table_name', 100)->nullable()->change();
            }
        });

        if (Schema::hasColumn('audit_logs', 'subject_type') && Schema::hasColumn('audit_logs', 'subject_id')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->index(['subject_type', 'subject_id'], 'idx_audit_logs_subject');
            });
        }
    }

    public function down(): void {}
};
