# Parent / student row-level access audit

V1 ships **without a parent or student portal**. This document records
the current state of the parent/student attack surface and the
defense-in-depth lock that was added so a future seeder slip cannot leak
data.

## Current state (V1)

### Roles

`database/seeders/RolesSeeder.php`:

| id | code | name |
|---:|---|---|
| 9 | `parent` | Parent |
| 10 | `student` | Élève |

Both roles **exist and can authenticate** (sanctum login is gated by
credentials, not by role). They cannot, however, currently reach any
data endpoint — see "Permissions" below.

### Permissions granted

`database/seeders/PermissionSeeder.php:166-167`:

```php
9  => array_merge($dashboardOnly, $pick(['notifications.view', 'announcements.view'])),
10 => array_merge($dashboardOnly, $pick(['notifications.view', 'announcements.view'])),
```

Both roles get only `dashboard.view`, `notifications.view`,
`announcements.view`. **None of `students.view`, `documents.view`,
`grades.view`, `attendance.view`, `finance.view`, `guardians.view`** is
granted by the seeder.

### User → student/guardian linkage

There is **no link**: `users` has no `student_id` or `guardian_id`
column, the `User` model has no `student()` / `guardian()` /
`children()` relation, and `student_guardians` joins
`students ↔ guardians`, not `students ↔ users`. There is therefore no
mechanical way today to derive "the children of the logged-in parent"
from a request.

### Routes

`routes/api.php` contains **no** `/parent/*` or `/student/*` routes,
no `ParentPortalController`, `StudentPortalController`,
`MyChildrenController`, or `MyGradesController`.

### Sensitive endpoints — owner scoping?

For each endpoint, the column "Owner-scoped?" answers: *if a future
seeder granted the relevant `*.view` permission to role 9 or 10, would
the response still be filtered to "only the user's own data"?*

| Endpoint | Permission gate | Owner-scoped? |
|---|---|---|
| `GET /v1/students` | `students.view` | ❌ No. Returns all rows; `student_id` is a query filter, not a derived owner. |
| `GET /v1/documents` | `documents.view` | ❌ No. `is_confidential` and `visibility_scope` columns exist but are not consulted in the controller. |
| `GET /v1/grades` | `grades.view` | ❌ Not for parent/student. (Teachers are scoped via `TeacherScopeService`.) |
| `GET /v1/attendance-records` | `attendance.view` | ❌ Not for parent/student. (Teachers are scoped.) |
| `GET /v1/invoices` | `finance.view` | ❌ No. |
| `GET /v1/payments` | `finance.view` | ❌ No. |
| `GET /v1/fee-assignments` | `finance.view` | ❌ No. |

**Risk class:** if `parent` or `student` were granted any of these
`*.view` permissions — by a careless seeder update, an admin checkbox
in a future settings UI, or a manual `INSERT INTO role_permissions` —
the endpoints would return the **entire institution's data set** to the
caller, not just their own child.

## Mitigation applied in this pass

A defense-in-depth middleware was added to make the
permission-bypass scenario impossible regardless of what gets seeded
into `role_permissions` later.

### `BlockUnreadyPortalRoles` middleware

- File: [`backend-api/app/Http/Middleware/BlockUnreadyPortalRoles.php`](../../backend-api/app/Http/Middleware/BlockUnreadyPortalRoles.php)
- Aliased as `block_unready_portal_roles` in
  [`bootstrap/app.php`](../../backend-api/bootstrap/app.php).
- Applied on the protected v1 group in
  [`routes/api.php`](../../backend-api/routes/api.php) alongside
  `auth:sanctum` and `throttle:api`.

Behavior: if `request.user.role.code in {parent, student}` and the
request path is **not** in a tiny allow-list, the request is rejected
with **HTTP 503 — "Espace parent/élève non encore disponible."**

The choice of 503 (Service Unavailable) over 403 is deliberate: 403
implies "you might get in if you had the right permission"; 503
broadcasts "this surface does not exist yet". The frontend can render a
clean coming-soon screen on 503 without users (or attackers) probing
for which exact permission would unlock the route.

### Allow-list

The middleware permits these path suffixes (after `/v1/`) for the two
blocked roles:

- `auth/me`, `auth/logout`, `auth/change-password` — required so a
  logged-in parent can sign out and update their own password.
- `app-settings`, `simple-school-settings` — read-only school metadata
  (logo, name) that the future portal will need.
- `dashboard` — neutral landing screen with no per-student data.
- `notifications`, `announcements` — broadcast surfaces, no
  per-student data leak.

Anything else — including all data endpoints listed in the table above
— returns 503 unconditionally for these two roles, **even if the
permission middleware would have admitted them.** The
permission-middleware path is the second layer; the role-block is the
first.

### Why not just delete the roles?

The roles are referenced in the schema (FK `users.role_id`) and may
already exist in production data. Removing them risks orphaning
accounts. Locking them out at the request layer is reversible (delete
the middleware alias from the route group) and surfaces in code review
the moment someone tries to enable the portal.

## When the portal IS implemented

Do **not** "just remove the middleware." The portal must ship with:

1. A `users.guardian_id` (or equivalent linkage) column with FK to
   `guardians`. A user with role `parent` MUST have a non-null link.
   Seeder/admin UI must enforce this on account creation.
2. A `MyChildrenController` (or similar) that derives the visible
   `student_id` set from `users.guardian_id → student_guardians →
   students` and **never** trusts a `student_id` query parameter.
3. Owner-scoped variants of any data endpoint exposed to the portal —
   `GET /v1/portal/grades?student_id=X` must verify X is in the
   derived set, not just trust the filter.
4. Document confidentiality enforcement (`is_confidential = true` and
   `visibility_scope` ∈ `{staff, teacher}` must be hidden even from
   linked parents).
5. A test suite under `tests/Feature/PortalAuthTest.php` proving:
   - Parent A cannot fetch grades for child of parent B.
   - Document with `visibility_scope = staff` is 404 to any parent.
   - Path tampering (`/students/{otherChildId}`) returns 403/404, not
     200.

Then, and only then, remove `parent` (and/or `student`) from the
`$blocked` array in `BlockUnreadyPortalRoles` and add the new
`/v1/portal/*` prefix to `$allowedPathSuffixes` (or refactor the
allow-list into a positive permission grant).

## Verification (this pass)

- `php -l` clean on the new middleware, `bootstrap/app.php`, and
  `routes/api.php`.
- No schema or seeder changes.
- Roles other than `parent` / `student` are unaffected.
- Public routes (`/v1/health`, `/v1/auth/login`,
  `/v1/auth/forgot-password`, `/v1/auth/reset-password`) are outside
  the protected group and outside the middleware's scope, so login
  still works for these users — they just can't reach data endpoints
  after authenticating.

## Files touched

- [`backend-api/app/Http/Middleware/BlockUnreadyPortalRoles.php`](../../backend-api/app/Http/Middleware/BlockUnreadyPortalRoles.php) — new.
- [`backend-api/bootstrap/app.php`](../../backend-api/bootstrap/app.php) — registered the alias.
- [`backend-api/routes/api.php`](../../backend-api/routes/api.php) — added the alias to the protected v1 group's middleware stack.
