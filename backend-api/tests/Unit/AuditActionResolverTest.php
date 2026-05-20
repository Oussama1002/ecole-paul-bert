<?php

namespace Tests\Unit;

use App\Support\AuditActionResolver;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;

class AuditActionResolverTest extends TestCase
{
    public function test_resolves_get_schedule_weekly(): void
    {
        $request = Request::create('/api/v1/schedule/weekly', 'GET', ['school_year_id' => 1]);
        $request->server->set('REQUEST_URI', '/api/v1/schedule/weekly');

        $this->assertSame('access.schedule_weekly', AuditActionResolver::fromRequest($request));
    }

    public function test_resolves_post_with_numeric_id(): void
    {
        $request = Request::create('/api/v1/students/42', 'PATCH');
        $request->server->set('REQUEST_URI', '/api/v1/students/42');

        $this->assertSame('update.students_id', AuditActionResolver::fromRequest($request));
    }

    public function test_skips_auth_me(): void
    {
        $request = Request::create('/api/v1/auth/me', 'GET');
        $this->assertTrue(AuditActionResolver::shouldSkipAccessLog($request));
    }
}
