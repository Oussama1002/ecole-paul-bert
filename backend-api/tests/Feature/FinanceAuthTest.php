<?php

namespace Tests\Feature;

use Tests\TestCase;

class FinanceAuthTest extends TestCase
{
    public function test_fee_types_requires_authentication(): void
    {
        $this->getJson('/api/v1/fee-types')->assertStatus(401);
    }

    public function test_fee_assignments_requires_authentication(): void
    {
        $this->getJson('/api/v1/fee-assignments')->assertStatus(401);
    }

    public function test_invoices_requires_authentication(): void
    {
        $this->getJson('/api/v1/invoices')->assertStatus(401);
    }

    public function test_payments_requires_authentication(): void
    {
        $this->getJson('/api/v1/payments')->assertStatus(401);
    }

    public function test_finance_bilan_requires_authentication(): void
    {
        $this->getJson('/api/v1/finance/bilan')->assertStatus(401);
    }

    public function test_finance_bilan_pdf_requires_authentication(): void
    {
        $this->getJson('/api/v1/finance/bilan/pdf')->assertStatus(401);
    }

    public function test_finance_bilan_excel_export_requires_authentication(): void
    {
        $this->getJson('/api/v1/finance/bilan/export.xlsx')->assertStatus(401);
    }
}

