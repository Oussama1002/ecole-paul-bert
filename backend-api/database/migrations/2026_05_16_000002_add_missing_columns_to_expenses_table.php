<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            if (! Schema::hasColumn('expenses', 'vendor')) {
                $table->string('vendor', 150)->nullable()->after('amount');
            }
            if (! Schema::hasColumn('expenses', 'reference')) {
                $table->string('reference', 100)->nullable()->index()->after('vendor');
            }
            if (! Schema::hasColumn('expenses', 'description')) {
                $table->text('description')->nullable()->after('reference');
            }
            if (! Schema::hasColumn('expenses', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->index()->after('status');
            }
            if (! Schema::hasColumn('expenses', 'cancelled_by')) {
                $table->unsignedBigInteger('cancelled_by')->nullable()->index()->after('cancelled_at');
            }
            if (! Schema::hasColumn('expenses', 'cancel_reason')) {
                $table->text('cancel_reason')->nullable()->after('cancelled_by');
            }
            if (! Schema::hasColumn('expenses', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->index()->after('cancel_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn(array_filter(
                ['vendor', 'reference', 'description', 'cancelled_at', 'cancelled_by', 'cancel_reason', 'created_by'],
                fn ($col) => Schema::hasColumn('expenses', $col)
            ));
        });
    }
};
