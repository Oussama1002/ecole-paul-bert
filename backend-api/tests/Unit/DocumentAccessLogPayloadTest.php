<?php

namespace Tests\Unit;

use App\Models\DocumentAccessLog;
use Tests\TestCase;

class DocumentAccessLogPayloadTest extends TestCase
{
    public function test_write_access_uses_base_sql_columns_when_present(): void
    {
        $at = now();

        $payload = DocumentAccessLog::buildAccessPayloadForSupportedColumns(
            [
                'action' => false,
                'ip' => false,
                'created_at' => false,
                'action_type' => true,
                'ip_address' => true,
                'accessed_at' => true,
                'user_agent' => true,
            ],
            10,
            20,
            'download',
            '127.0.0.1',
            'UA',
            $at
        );

        $this->assertArrayHasKey('action_type', $payload);
        $this->assertArrayHasKey('ip_address', $payload);
        $this->assertArrayHasKey('accessed_at', $payload);
        $this->assertArrayNotHasKey('action', $payload);
        $this->assertArrayNotHasKey('ip', $payload);
        $this->assertArrayNotHasKey('created_at', $payload);
    }

    public function test_write_access_uses_laravel_columns_when_present(): void
    {
        $at = now();

        $payload = DocumentAccessLog::buildAccessPayloadForSupportedColumns(
            [
                'action' => true,
                'ip' => true,
                'created_at' => true,
                'action_type' => false,
                'ip_address' => false,
                'accessed_at' => false,
                'user_agent' => true,
            ],
            1,
            null,
            'view',
            null,
            null,
            $at
        );

        $this->assertArrayHasKey('action', $payload);
        $this->assertArrayHasKey('ip', $payload);
        $this->assertArrayHasKey('created_at', $payload);
        $this->assertArrayNotHasKey('action_type', $payload);
        $this->assertArrayNotHasKey('ip_address', $payload);
        $this->assertArrayNotHasKey('accessed_at', $payload);
    }
}

