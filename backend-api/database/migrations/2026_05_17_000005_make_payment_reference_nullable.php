<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('payments', 'payment_reference')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->string('payment_reference', 50)->nullable()->default(null)->change();
            });
        }
    }

    public function down(): void {}
};
