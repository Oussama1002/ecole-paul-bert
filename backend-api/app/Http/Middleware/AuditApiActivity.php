<?php

namespace App\Http\Middleware;

use App\Services\AuditLogger;
use App\Support\AuditActionResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Records API activity in audit_logs for all authenticated users (including teachers).
 */
class AuditApiActivity
{
    public function __construct(private AuditLogger $audit) {}

    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        if (! $request->is('api/*')) {
            return;
        }

        $status = $response->getStatusCode();
        if ($status >= 500) {
            return;
        }

        $user = $request->user();
        if ($user === null) {
            return;
        }

        $method = strtoupper($request->method());
        if ($method === 'GET' && AuditActionResolver::shouldSkipAccessLog($request)) {
            return;
        }

        // Successful mutations are also logged with detail in controllers; keep a trace here too.
        if ($method === 'GET' && $status >= 400) {
            return;
        }

        if ($method !== 'GET' && $status >= 400) {
            return;
        }

        $this->audit->log(
            $user,
            AuditActionResolver::fromRequest($request),
            null,
            null,
            [
                'method' => $method,
                'path' => '/'.trim($request->path(), '/'),
                'query' => $request->query()->all() !== [] ? $request->query()->all() : null,
                'status' => $status,
            ],
            $request
        );
    }
}
