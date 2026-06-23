<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanTestData extends Command
{
    protected $signature = 'db:clean-testdata
                            {--force : Skip confirmation prompt}';

    protected $description = 'Remove test/demo data before production deployment. Keeps structural data (school years, levels, subjects, fee types). Removes students, enrollments, grades, attendance, payments, invoices, expenses, documents, journal entries, teachers, users (except super_admin).';

    public function handle(): int
    {
        // Hard guard: refuse to run unless an explicit, hard-to-fat-finger env var is set.
        // This prevents any cron, deploy script, or accident from truncating production data.
        if (env('ALLOW_DB_CLEAN_TESTDATA') !== 'I_REALLY_WANT_TO_WIPE_DATA') {
            $this->error('Refusing to run. Set ALLOW_DB_CLEAN_TESTDATA="I_REALLY_WANT_TO_WIPE_DATA" in .env to enable.');
            \Illuminate\Support\Facades\Log::warning('db:clean-testdata invocation refused (env guard not set).');
            return self::FAILURE;
        }

        if (app()->environment('production') && ! $this->option('force')) {
            if (! $this->confirm('You are on PRODUCTION. Are you sure you want to delete test data?')) {
                $this->info('Aborted.');
                return self::SUCCESS;
            }
        }

        $this->info('Cleaning test/demo data...');

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        $tables = [
            'audit_logs',
            'internal_notifications',
            'document_access_logs',
            'documents',
            'teacher_documents',
            'teacher_observations',
            'teacher_attendances',
            'attendance_justification_logs',
            'attendance_records',
            'grades',
            'report_cards',
            'finance_journal_entries',
            'payments',
            'invoice_items',
            'invoices',
            'fee_assignments',
            'expenses',
            'student_guardians',
            'guardians',
            'enrollments',
            'student_class_assignments',
            'students',
            'teacher_class_subjects',
            'schedule_entries',
            'teachers',
            'personal_access_tokens',
        ];

        foreach ($tables as $table) {
            if (DB::getSchemaBuilder()->hasTable($table)) {
                DB::table($table)->truncate();
                $this->line("  Cleared: {$table}");
            }
        }

        // Remove all non-super_admin users
        DB::table('users')
            ->whereNotIn('id', function ($q) {
                $q->select('users.id')
                  ->from('users')
                  ->join('roles', 'roles.id', '=', 'users.role_id')
                  ->where('roles.code', 'super_admin');
            })
            ->delete();
        $this->line('  Cleared: users (kept super_admin)');

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $this->info('Test data removed. Structural data (school years, levels, classes, subjects, fee types, roles) preserved.');

        return self::SUCCESS;
    }
}
