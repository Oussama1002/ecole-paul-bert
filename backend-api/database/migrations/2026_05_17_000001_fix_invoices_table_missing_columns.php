<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('invoices')) {
            return;
        }

        Schema::table('invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('invoices', 'enrollment_id')) {
                $table->unsignedBigInteger('enrollment_id')->nullable()->index()->after('student_id');
            }
            if (! Schema::hasColumn('invoices', 'school_year_id')) {
                $table->unsignedBigInteger('school_year_id')->nullable()->index()->after('enrollment_id');
            }
            if (! Schema::hasColumn('invoices', 'invoice_number')) {
                $table->string('invoice_number', 50)->nullable()->after('school_year_id');
            }
            if (! Schema::hasColumn('invoices', 'invoice_type')) {
                $table->string('invoice_type', 30)->default('standard')->after('invoice_number');
            }
            if (! Schema::hasColumn('invoices', 'issue_date')) {
                $table->date('issue_date')->nullable()->after('invoice_type');
            }
            if (! Schema::hasColumn('invoices', 'due_date')) {
                $table->date('due_date')->nullable()->after('issue_date');
            }
            if (! Schema::hasColumn('invoices', 'subtotal')) {
                $table->decimal('subtotal', 10, 2)->default(0)->after('due_date');
            }
            if (! Schema::hasColumn('invoices', 'discount_amount')) {
                $table->decimal('discount_amount', 10, 2)->default(0)->after('subtotal');
            }
            if (! Schema::hasColumn('invoices', 'tax_amount')) {
                $table->decimal('tax_amount', 10, 2)->default(0)->after('discount_amount');
            }
            if (! Schema::hasColumn('invoices', 'total_amount')) {
                $table->decimal('total_amount', 10, 2)->default(0)->after('tax_amount');
            }
            if (! Schema::hasColumn('invoices', 'amount_paid')) {
                $table->decimal('amount_paid', 10, 2)->default(0)->after('total_amount');
            }
            if (! Schema::hasColumn('invoices', 'amount_due')) {
                $table->decimal('amount_due', 10, 2)->default(0)->after('amount_paid');
            }
            if (! Schema::hasColumn('invoices', 'notes')) {
                $table->text('notes')->nullable()->after('amount_due');
            }
            if (! Schema::hasColumn('invoices', 'created_by')) {
                $table->unsignedBigInteger('created_by')->nullable()->index()->after('notes');
            }
            if (! Schema::hasColumn('invoices', 'validated_by')) {
                $table->unsignedBigInteger('validated_by')->nullable()->after('created_by');
            }
        });

        // Fix status column if it is an ENUM that doesn't match the code's expected values
        $col = DB::selectOne("SHOW COLUMNS FROM invoices WHERE Field = 'status'");
        if ($col && str_contains((string) $col->Type, 'enum')) {
            DB::statement("ALTER TABLE invoices MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'draft'");
        }
    }

    public function down(): void {}
};
