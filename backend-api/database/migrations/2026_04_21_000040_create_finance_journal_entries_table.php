<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('finance_journal_entries')) {
            return;
        }

        Schema::create('finance_journal_entries', function (Blueprint $table) {
            $table->id();
            $table->date('entry_date')->index();
            // income | expense
            $table->string('entry_type', 10)->index();
            // for expenses: fixed | variable ; NULL for income
            $table->string('cost_type', 20)->nullable()->index();
            $table->string('label', 160);
            $table->decimal('amount', 12, 2);
            $table->text('note')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_journal_entries');
    }
};
