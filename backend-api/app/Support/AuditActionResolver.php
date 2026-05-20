<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Builds stable audit action codes from HTTP method + API path (max 120 chars).
 */
class AuditActionResolver
{
    /**
     * High-frequency read endpoints excluded from access.* audit noise.
     *
     * @var list<string>
     */
    public const SKIP_ACCESS_PATHS = [
        'v1/auth/me',
        'v1/app-settings',
        'v1/simple-school-settings',
        'v1/dashboard/indicators',
        'v1/audit-logs',
        'v1/health',
    ];

    public static function shouldSkipAccessLog(Request $request): bool
    {
        $path = self::normalizePath($request);

        if (in_array($path, self::SKIP_ACCESS_PATHS, true)) {
            return true;
        }

        if (str_starts_with($path, 'v1/internal-notifications')) {
            return true;
        }

        return false;
    }

    public static function fromRequest(Request $request): string
    {
        $method = strtoupper($request->method());
        $path = self::normalizePath($request);

        $verb = match ($method) {
            'GET' => 'access',
            'POST' => 'create',
            'PUT', 'PATCH' => 'update',
            'DELETE' => 'destroy',
            default => 'request',
        };

        $slug = self::pathSlug($path);

        $action = "{$verb}.{$slug}";

        return strlen($action) <= 120 ? $action : substr($action, 0, 120);
    }

    private static function normalizePath(Request $request): string
    {
        $path = trim($request->path(), '/');
        if (str_starts_with($path, 'api/')) {
            $path = substr($path, 4);
        }

        return $path;
    }

    private static function pathSlug(string $path): string
    {
        $parts = explode('/', $path);
        if (($parts[0] ?? '') === 'v1') {
            array_shift($parts);
        }

        if ($parts === []) {
            return 'api';
        }

        $slugParts = [];
        foreach ($parts as $part) {
            if (ctype_digit($part)) {
                $slugParts[] = 'id';

                continue;
            }
            $slugParts[] = str_replace('-', '_', $part);
        }

        return implode('_', $slugParts) ?: 'api';
    }
}
