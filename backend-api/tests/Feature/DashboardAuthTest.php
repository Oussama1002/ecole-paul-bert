<?php

namespace Tests\Feature;

use Tests\TestCase;

class DashboardAuthTest extends TestCase
{
    public function test_dashboard_requires_authentication(): void
    {
        $this->getJson('/api/v1/dashboard')->assertStatus(401);
    }

    public function test_dashboard_indicators_requires_authentication(): void
    {
        $this->getJson('/api/v1/dashboard/indicators')->assertStatus(401);
    }
}
