<?php

namespace Tests\Feature;

use Tests\TestCase;

class GradesAndReportCardsAuthTest extends TestCase
{
    public function test_grades_index_requires_authentication(): void
    {
        $this->getJson('/api/v1/grades')->assertStatus(401);
    }

    public function test_grades_bulk_requires_authentication(): void
    {
        $this->postJson('/api/v1/grades/bulk', [])->assertStatus(401);
    }

    public function test_grades_class_ranking_requires_authentication(): void
    {
        $this->getJson('/api/v1/grades/class-ranking')->assertStatus(401);
    }

    public function test_report_cards_index_requires_authentication(): void
    {
        $this->getJson('/api/v1/report-cards')->assertStatus(401);
    }

    public function test_report_cards_generate_requires_authentication(): void
    {
        $this->postJson('/api/v1/report-cards/generate', [])->assertStatus(401);
    }
}

