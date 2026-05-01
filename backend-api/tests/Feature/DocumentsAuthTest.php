<?php

namespace Tests\Feature;

use Tests\TestCase;

class DocumentsAuthTest extends TestCase
{
    public function test_documents_index_requires_authentication(): void
    {
        $this->getJson('/api/v1/documents')->assertStatus(401);
    }

    public function test_documents_store_requires_authentication(): void
    {
        $this->postJson('/api/v1/documents', [])->assertStatus(401);
    }

    public function test_documents_download_requires_authentication(): void
    {
        $this->getJson('/api/v1/documents/1/download')->assertStatus(401);
    }
}

