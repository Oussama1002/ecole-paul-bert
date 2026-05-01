# Production Readiness Checklist — École Paul Bert

Use this checklist before go-live for Paul Bert (API Laravel + frontend React/Vite).

## 1) Environment Variables

### Backend (`backend-api/.env`)

- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] `APP_KEY` generated (`php artisan key:generate --show` if needed)
- [ ] `APP_URL` points to public API URL (HTTPS)
- [ ] `FRONTEND_URL` set to production frontend URL
- [ ] `CORS_ALLOWED_ORIGINS` set to production frontend URL(s) only
- [ ] DB variables set correctly (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`)
- [ ] `DB_COLLATION` compatible with target MySQL/MariaDB
- [ ] Session/cache/queue strategy chosen for production
  - Current baseline in repo: file/session, `QUEUE_CONNECTION=sync`
- [ ] Logging set for production
  - Recommended: `LOG_CHANNEL=daily`, `LOG_LEVEL=warning`
- [ ] Mail settings configured (no `log` mailer in production)
- [ ] `SANCTUM_STATEFUL_DOMAINS` reviewed for production domains

### Frontend (`frontend-admin/.env`)

- [ ] `VITE_API_BASE_URL` set to production API origin (if not using reverse proxy)
- [ ] Build-time variables validated with `npm run build`

## 2) Database Migration Status

- [ ] Confirm target DB is backed up before schema operations
- [ ] Run migrations:
  - `php artisan migrate --force`
- [ ] Validate migration status:
  - `php artisan migrate:status`
- [ ] Verify no schema drift against expected app features
  - Pay attention to legacy/non-standard IDs and optional columns (see prior schema drift audit)
- [ ] Seed required permissions/roles if needed:
  - `php artisan db:seed --class=PermissionSeeder`
  - `php artisan db:seed --class=RolesSeeder` (if applicable)

## 3) Storage Link and File Permissions

- [ ] Create/refresh symbolic link:
  - `php artisan storage:link`
- [ ] Ensure web/PHP user can read/write:
  - `storage/`
  - `bootstrap/cache/`
- [ ] Verify file generation/download paths work:
  - report cards PDFs
  - receipts PDFs
  - invoice PDFs
  - document uploads/downloads

## 4) Queue / Cron Status (If Used)

Current codebase status:

- Business flows currently run with `QUEUE_CONNECTION=sync` by default.
- No production-critical scheduled jobs are defined (only default `inspire` command in console routes).

Checklist:

- [ ] Decide runtime mode:
  - Keep `sync` (simpler, lower ops complexity), or
  - Move to async queue (`database`/`redis`) for scalability.
- [ ] If async queue enabled:
  - [ ] start queue workers (Supervisor/systemd)
  - [ ] configure failed jobs monitoring/retry policy
- [ ] If scheduler is introduced later:
  - [ ] add cron entry: `* * * * * php artisan schedule:run`

## 5) Backup Strategy

- [ ] Daily full DB backup
- [ ] Hourly incremental/binlog strategy (or equivalent) if available
- [ ] Backup retention policy documented (e.g., 7 daily + 4 weekly + 6 monthly)
- [ ] Offsite backup copy enabled
- [ ] Restore drill tested on non-production environment
- [ ] Backup verification includes:
  - schema
  - users/roles/permissions
  - financial tables
  - audit logs
  - uploaded files in storage

## 6) SSL / Domain

- [ ] Domain DNS correctly points to production server
- [ ] Valid SSL certificate installed (Let’s Encrypt or managed cert)
- [ ] HTTP to HTTPS redirect enabled
- [ ] Mixed-content check completed for frontend/API requests
- [ ] Secure headers configured (HSTS, X-Content-Type-Options, etc.) at web server/proxy level

## 7) Admin Account Setup

- [ ] Create initial production admin account(s) with strong passwords
- [ ] Remove/disable default dev/demo credentials
- [ ] Verify admin can:
  - log in
  - manage users/roles
  - access advanced-only pages
- [ ] Enforce password reset on first login for bootstrap accounts (policy/process)

## 8) Test Data Cleanup

- [ ] Remove QA/demo students, invoices, payments, grades created during testing
- [ ] Remove QA observation and journal entries
- [ ] Confirm no `QA-*` style references remain in production data
- [ ] Keep only business-approved seed/reference data
- [ ] Re-run key dashboard/finance/report queries after cleanup

## 9) Error Logging

- [ ] Laravel logs stored and rotated (`daily` channel recommended)
- [ ] 500/exception responses are sanitized (already standardized in API bootstrap)
- [ ] Centralized log shipping enabled (optional but recommended)
- [ ] Alert rule for high error rate / repeated exceptions
- [ ] Access denied/auth failures monitored for abuse patterns

## 10) Basic Monitoring

- [ ] Uptime check for:
  - frontend URL
  - `GET /api/v1/health`
- [ ] Basic metrics tracked:
  - response time (p95)
  - error rate
  - DB CPU/storage
  - disk space (especially `storage/`)
- [ ] Capacity alerts configured (disk, memory, DB connections)
- [ ] Incident contact/escalation channel defined

## 11) Deployment Steps (Recommended Runbook)

1. [ ] Put app in maintenance mode (if required by your release strategy)
2. [ ] Pull/tag release code
3. [ ] Backend dependencies:
   - `composer install --no-dev --optimize-autoloader`
4. [ ] Frontend dependencies/build:
   - `npm ci`
   - `npm run build`
5. [ ] Apply DB migrations:
   - `php artisan migrate --force`
6. [ ] Cache optimization:
   - `php artisan config:cache`
   - `php artisan route:cache` (if safe for your dynamic route usage)
   - `php artisan view:cache`
7. [ ] Ensure storage link:
   - `php artisan storage:link`
8. [ ] Restart PHP-FPM / web service / queue workers as needed
9. [ ] Smoke tests:
   - login
   - student create/enroll
   - attendance mark
   - payment + receipt
   - grades + bulletin PDF
   - dashboard counters
10. [ ] Exit maintenance mode
11. [ ] Post-deploy monitoring for 30–60 minutes

## 12) Go-Live Sign-off

- [ ] Technical lead sign-off
- [ ] School director/UAT sign-off
- [ ] Backup/rollback plan confirmed
- [ ] Support contacts communicated for first production week
