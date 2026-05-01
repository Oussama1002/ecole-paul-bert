<?php

namespace Tests\Feature;

use Tests\TestCase;

class Phase11Phase12ApiAuthTest extends TestCase
{
    public function test_announcements_index_requires_authentication(): void
    {
        $this->getJson('/api/v1/announcements')->assertStatus(401);
    }

    public function test_internal_notifications_index_requires_authentication(): void
    {
        $this->getJson('/api/v1/internal-notifications')->assertStatus(401);
    }

    public function test_audit_logs_index_requires_authentication(): void
    {
        $this->getJson('/api/v1/audit-logs')->assertStatus(401);
    }

    public function test_students_export_excel_requires_authentication(): void
    {
        $this->getJson('/api/v1/students/export.xlsx')->assertStatus(401);
    }

    public function test_grades_export_excel_requires_authentication(): void
    {
        $this->getJson('/api/v1/grades/export.xlsx')->assertStatus(401);
    }

    public function test_attendance_export_excel_requires_authentication(): void
    {
        $this->getJson('/api/v1/attendance-records/export.xlsx')->assertStatus(401);
    }

    public function test_finance_expenses_export_requires_authentication(): void
    {
        $this->getJson('/api/v1/finance/expenses/export.xlsx')->assertStatus(401);
    }

    public function test_finance_summary_pdf_requires_authentication(): void
    {
        $this->getJson('/api/v1/finance/summary/report.pdf')->assertStatus(401);
    }
}
