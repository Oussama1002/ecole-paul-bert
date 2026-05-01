# Go-Live Check — École Paul Bert

Date: 2026-04-30  
Scope: final production-readiness verification (backend API + frontend admin)

Status scale:
- **PASS**: ready for production
- **PARTIAL**: acceptable baseline, but requires infra/runtime confirmation
- **FAIL/BLOCKER**: must be resolved before go-live

## 1) Environment

### Required
- `APP_ENV=production`
- `APP_DEBUG=false`

### Evidence
- Current `backend-api/.env` contains:
  - `APP_ENV=local`
  - `APP_DEBUG=true`
- `APP_URL=http://localhost:8000`
- `FRONTEND_URL=http://localhost:5173`
- `CORS_ALLOWED_ORIGINS=http://localhost:5173`

### Verdict
- **FAIL/BLOCKER**

### Required action before go-live
- Update production `.env` values:
  - `APP_ENV=production`
  - `APP_DEBUG=false`
  - `APP_URL=https://<production-api-domain>`
  - `FRONTEND_URL=https://<production-frontend-domain>`
  - `CORS_ALLOWED_ORIGINS=https://<production-frontend-domain>`
- Rebuild caches after env update:
  - `php artisan config:cache`

## 2) Storage

### Required
- storage linked
- uploads accessible

### Evidence
- `php artisan storage:link` succeeded (link connected message returned).
- Runtime filesystem checks:
  - `public/storage` exists as directory.
  - `storage/app/public` exists.

### Verdict
- **PASS** (local verification)

### Notes
- On Windows, symlink/junction detection can differ; functional check is that `public/storage` resolves and files are reachable.

## 3) Security

### Required
- no open routes
- permissions enforced

### Evidence
- API routes are grouped under auth middleware:
  - `auth:sanctum`, `throttle:api`, `block_unready_portal_roles`
- Business endpoints are protected with granular permission middleware (`permission:*`).
- Public routes are limited to expected endpoints:
  - health check
  - login
  - forgot/reset password (throttled)
- Rate limiting is configured for login, forgot-password, and API traffic.

### Verdict
- **PARTIAL**

### Notes
- Route-level protections are correctly implemented in code.
- Final production verification still needed with real roles/users:
  - attempt unauthorized access and confirm `403`
  - confirm no privileged access leaks for non-admin profiles

## 4) SSL

### Required
- HTTPS working

### Evidence
- Current environment URLs are localhost HTTP.
- No deploy-domain TLS endpoint available in this local verification context.

### Verdict
- **FAIL/BLOCKER** (not yet verifiable/configured for production)

### Required action before go-live
- Install valid TLS cert on production domain.
- Enforce HTTP -> HTTPS redirect at reverse proxy/web server.
- Confirm frontend and API both load over HTTPS without mixed content.

## 5) Database

### Required
- migrations aligned
- no test data issues

### Evidence
- `php artisan migrate:status` shows one pending migration:
  - `2026_04_30_140000_add_category_and_attachment_to_finance_journal_entries_table` -> **Pending**
- QA residue check found test-style records:
  - `qa_students = 6`
  - `qa_payments = 5`

### Verdict
- **FAIL/BLOCKER**

### Required action before go-live
- Apply pending migration:
  - `php artisan migrate --force`
- Clean QA/demo residues from production dataset.
- Re-run smoke checks after cleanup:
  - dashboards
  - finance pages
  - receipts/invoices

## 6) Backup

### Required
- daily DB backup configured

### Evidence
- No backup scheduler/job configuration found in application code.
- Console schedule currently only contains:
  - `inspire` hourly
  - `qa:client-flow-test` command registration (not scheduled as daily backup)

### Verdict
- **FAIL/BLOCKER**

### Required action before go-live
- Configure daily DB backup in infrastructure (or Laravel scheduler + backup command).
- Add retention policy and restore drill evidence.

## 7) Performance

### Required
- no blocking queries
- pagination enabled

### Evidence
- Most list endpoints use pagination with bounded `per_page`.
- Some export/report endpoints intentionally use large `get()`/`limit()` (expected for exports).
- No immediate N+1 red flags surfaced in this quick controller-level scan.

### Verdict
- **PARTIAL**

### Notes
- Pagination requirement is broadly satisfied.
- “No blocking queries” needs production telemetry confirmation:
  - slow query log
  - p95 API latency
  - DB CPU/IO during peak usage

## Final Go/No-Go

- **Current verdict: NO-GO**

### Blocking items to close
1. Switch environment to production-safe values (`APP_ENV`, `APP_DEBUG`, production URLs/CORS).
2. Apply pending migration.
3. Remove QA/demo data from production database.
4. Configure and validate daily backup (with retention + restore test).
5. Enable and verify HTTPS on production domain.

### Recommended re-check command set
- `php artisan migrate:status`
- `php artisan migrate --force`
- `php artisan storage:link`
- `php artisan route:list --path=api/v1 --except-vendor`
- targeted DB sanity counts for demo residues
- post-deploy smoke flow: login -> student -> attendance -> finance -> bulletin PDF
