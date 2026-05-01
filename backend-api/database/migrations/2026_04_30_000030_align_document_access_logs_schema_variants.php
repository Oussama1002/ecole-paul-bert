<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('document_access_logs')) {
            return;
        }

        // 1) Ensure "app schema" columns exist: action, ip, created_at
        Schema::table('document_access_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('document_access_logs', 'action')) {
                $table->string('action', 30)->nullable()->index();
            }
            if (! Schema::hasColumn('document_access_logs', 'ip')) {
                $table->string('ip', 45)->nullable();
            }
            if (! Schema::hasColumn('document_access_logs', 'created_at')) {
                $table->timestamp('created_at')->nullable();
            }
        });

        // 2) Ensure "base SQL schema" columns exist: action_type, ip_address, accessed_at
        Schema::table('document_access_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('document_access_logs', 'action_type')) {
                $table->string('action_type', 20)->nullable()->index();
            }
            if (! Schema::hasColumn('document_access_logs', 'ip_address')) {
                $table->string('ip_address', 45)->nullable();
            }
            if (! Schema::hasColumn('document_access_logs', 'accessed_at')) {
                $table->dateTime('accessed_at')->nullable();
            }
        });

        // 3) Backfill whichever side is missing, without overwriting existing values.
        $hasAction = Schema::hasColumn('document_access_logs', 'action');
        $hasIp = Schema::hasColumn('document_access_logs', 'ip');
        $hasCreatedAt = Schema::hasColumn('document_access_logs', 'created_at');

        $hasActionType = Schema::hasColumn('document_access_logs', 'action_type');
        $hasIpAddress = Schema::hasColumn('document_access_logs', 'ip_address');
        $hasAccessedAt = Schema::hasColumn('document_access_logs', 'accessed_at');

        // Base SQL -> app columns
        if ($hasAction && $hasActionType) {
            DB::statement("UPDATE document_access_logs SET action = action_type WHERE action IS NULL AND action_type IS NOT NULL");
        }
        if ($hasIp && $hasIpAddress) {
            DB::statement("UPDATE document_access_logs SET ip = ip_address WHERE ip IS NULL AND ip_address IS NOT NULL");
        }
        if ($hasCreatedAt && $hasAccessedAt) {
            DB::statement("UPDATE document_access_logs SET created_at = accessed_at WHERE created_at IS NULL AND accessed_at IS NOT NULL");
        }

        // App -> base SQL columns
        if ($hasActionType && $hasAction) {
            DB::statement("UPDATE document_access_logs SET action_type = action WHERE action_type IS NULL AND action IS NOT NULL");
        }
        if ($hasIpAddress && $hasIp) {
            DB::statement("UPDATE document_access_logs SET ip_address = ip WHERE ip_address IS NULL AND ip IS NOT NULL");
        }
        if ($hasAccessedAt && $hasCreatedAt) {
            DB::statement("UPDATE document_access_logs SET accessed_at = created_at WHERE accessed_at IS NULL AND created_at IS NOT NULL");
        }
    }

    public function down(): void
    {
        // Intentionally no-op: additive compatibility columns should not be dropped.
    }
};

