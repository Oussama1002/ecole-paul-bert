<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Normalise existing rows to the new status vocabulary before altering
        DB::table('expenses')->whereIn('status', ['draft', 'approved', 'paid'])->update(['status' => 'active']);

        // Change ENUM to a plain VARCHAR(20) that accepts 'active' / 'cancelled'
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('status', 20)->default('active')->change();
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->enum('status', ['draft', 'approved', 'paid', 'cancelled'])->default('approved')->change();
        });
    }
};
