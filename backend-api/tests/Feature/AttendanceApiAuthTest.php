<?php

namespace Tests\Feature;

use Tests\TestCase;

class AttendanceApiAuthTest extends TestCase
{
    public function test_attendance_records_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/attendance-records');

        $response->assertStatus(401);
    }

    public function test_attendance_records_store_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/attendance-records', []);

        $response->assertStatus(401);
    }

    public function test_attendance_stats_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/attendance/stats');

        $response->assertStatus(401);
    }

    public function test_attendance_bulk_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/classes/1/attendance/bulk', []);

        $response->assertStatus(401);
    }
}

