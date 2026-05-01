<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Defense-in-depth: the parent/student portal is NOT implemented in V1.
 *
 * Both `parent` (role_id=9) and `student` (role_id=10) roles exist in the
 * roles table and could in theory log in. None of the data endpoints
 * (students, grades, attendance, finance, documents, …) carry owner-scope
 * filters today — if any future seeder or admin grants one of these roles
 * a `*.view` permission, the endpoint would leak the entire institution's
 * data set instead of just "the user's own child".
 *
 * Until a proper portal ships with per-row owner scoping, deny these
 * roles access to anything beyond the minimal account-management /
 * notification surface they need to be told the portal is coming.
 *
 * To re-enable a role, remove its code from $blocked or add the new
 * portal endpoints to $allowedPathPrefixes (and ship the matching
 * row-level scoping in the controllers — do NOT just whitelist).
 */
class BlockUnreadyPortalRoles
{
    /** @var list<string> */
    private array $blocked = ['parent', 'student'];

    /**
     * Path suffixes (after the `/api/v1/` prefix) that the blocked roles
     * may still hit. Keep this list intentionally tiny.
     *
     * @var list<string>
     */
    private array $allowedPathSuffixes = [
        'auth/me',
        'auth/logout',
        'auth/change-password',
        'app-settings',
        'simple-school-settings',
        'dashboard',
        'notifications',
        'announcements',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return $next($request);
        }

        $user->loadMissing('role');
        $code = $user->role?->code;
        if (! in_array($code, $this->blocked, true)) {
            return $next($request);
        }

        $path = ltrim($request->path(), '/');
        // Strip an optional leading `api/v1/` so the suffix comparison is
        // independent of how Laravel mounts the route file.
        foreach (['api/v1/', 'v1/'] as $prefix) {
            if (str_starts_with($path, $prefix)) {
                $path = substr($path, strlen($prefix));
                break;
            }
        }

        foreach ($this->allowedPathSuffixes as $allowed) {
            if ($path === $allowed || str_starts_with($path, $allowed.'/')) {
                return $next($request);
            }
        }

        abort(503, 'Espace parent/élève non encore disponible.');
    }
}
