<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('finance_journal_entries')) {
            return;
        }

        Schema::table('finance_journal_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('finance_journal_entries', 'category')) {
                $table->string('category', 80)->nullable()->after('cost_type');
            }
            if (! Schema::hasColumn('finance_journal_entries', 'attachment_path')) {
                $table->string('attachment_path', 255)->nullable()->after('note');
            }
            if (! Schema::hasColumn('finance_journal_entries', 'attachment_name')) {
                $table->string('attachment_name', 180)->nullable()->after('attachment_path');
            }
            if (! Schema::hasColumn('finance_journal_entries', 'attachment_mime')) {
                $table->string('attachment_mime', 120)->nullable()->after('attachment_name');
            }
            if (! Schema::hasColumn('finance_journal_entries', 'attachment_size')) {
                $table->unsignedBigInteger('attachment_size')->nullable()->after('attachment_mime');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('finance_journal_entries')) {
            return;
        }

        Schema::table('finance_journal_entries', function (Blueprint $table) {
            $columns = ['category', 'attachment_path', 'attachment_name', 'attachment_mime', 'attachment_size'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('finance_journal_entries', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
