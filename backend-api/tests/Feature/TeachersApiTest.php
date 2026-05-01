<?php

namespace Tests\Feature;

use Tests\TestCase;

class TeachersApiTest extends TestCase
{
    public function test_teachers_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/teachers');

        $response->assertStatus(401);
    }

    public function test_teacher_assignments_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/teachers/1/assignments');

        $response->assertStatus(401);
    }

    public function test_teacher_schedule_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/teachers/1/schedule');

        $response->assertStatus(401);
    }

    public function test_teacher_documents_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/teachers/1/documents');

        $response->assertStatus(401);
    }

    public function test_teacher_document_delete_requires_authentication(): void
    {
        $response = $this->deleteJson('/api/v1/teacher-documents/1');

        $response->assertStatus(401);
    }
}
