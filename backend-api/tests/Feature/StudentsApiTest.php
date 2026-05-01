<?php

namespace Tests\Feature;

use Tests\TestCase;

class StudentsApiTest extends TestCase
{
    public function test_students_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/students');

        $response->assertStatus(401);
    }

    public function test_students_export_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/students/export');

        $response->assertStatus(401);
    }

    public function test_enrollments_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/enrollments');

        $response->assertStatus(401);
    }

    public function test_guardians_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/guardians');

        $response->assertStatus(401);
    }
}
