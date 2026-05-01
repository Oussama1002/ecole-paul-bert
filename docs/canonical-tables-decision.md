# Canonical tables decision (duplicate domains)

Goal: reduce “duplicate sources of truth” without deleting tables or breaking existing data. Recommendation is to pick **one canonical table per domain**, treat the other as **legacy/read-only**, and add **bridges** (views / read-through / write-through) only when needed.

Evidence sources used:
- MySQL base structure: `backend-api/database/schema/paulbert_base_structure.sql`
- Migrations for newer tables: `backend-api/database/migrations/*`
- Code usage: `backend-api/app/Models`, `backend-api/app/Http/Controllers`, `backend-api/app/Services`

---

## 1) `bulletins` vs `report_cards`

### Current duplicated tables
- **Legacy**: `bulletins` (exists in base SQL)
- **New**: `report_cards` (created by migration; used by app)

### Current code usage
- **`report_cards` is used**:
  - Model: `app/Models/ReportCard.php`
  - Controller: `app/Http/Controllers/Api/V1/ReportCardController.php`
  - Service: `app/Services/ReportCardService` (referenced by controller)
- **`bulletins` appears unused** in `backend-api/app/` (no `Bulletin` model / controller references found).

### Recommended canonical table
- **Canonical: `report_cards`**

### Tables to keep as legacy/read-only
- **Keep `bulletins`** as legacy (do not delete).

### Migration/bridge strategy
- **Phase 0 (no-risk)**: do nothing; keep `bulletins` untouched.
- **Phase 1 (read bridge, optional)**: if you must display historic “bulletins” created by older code, add a **read-only endpoint** that reads from `bulletins` and maps into the `ReportCard` DTO shape (code-level adapter). No writes.
- **Phase 2 (data migration, optional and later)**: one-time migration script to copy `bulletins` rows into `report_cards` as archived entries (requires careful field mapping and uniqueness rules).

### Frontend impact
- UI should use **one concept**: “Bulletins” backed by `report_cards`.
- If legacy data is needed, add a “Historique (ancien format)” section sourced via the read bridge.

### API impact
- Keep existing `report_cards` endpoints canonical.
- If you add the legacy read bridge, name it clearly, e.g. `/v1/legacy/bulletins` (read-only).

---

## 2) `notifications` vs `internal_notifications`

### Current duplicated tables
- **Legacy**: `notifications` (exists in base SQL)
- **New**: `internal_notifications` (migration-created; used by app)

### Current code usage
- **`internal_notifications` is used**:
  - Model: `InternalNotification`
  - Controllers/services: `InternalNotificationController`, `DashboardDataService`, `AttendanceAlertService`, `SystemNotificationDispatcher`
- **`notifications` appears unused** in `backend-api/app/` (no model, no dispatcher).

### Recommended canonical table
- **Canonical: `internal_notifications`**

### Tables to keep as legacy/read-only
- Keep `notifications` as legacy.

### Migration/bridge strategy
- **Phase 0**: ensure `internal_notifications` table exists in all environments (migrations must run after loading base schema).
- **Phase 1 (read bridge if needed)**: if an older frontend reads `notifications`, provide an endpoint that reads `internal_notifications` and returns the legacy shape (`message`, `notification_type`, `is_read`, etc.).
- **Phase 2 (optional backfill)**: if you need to migrate legacy `notifications` into `internal_notifications`, do a one-time backfill:
  - `notifications.title -> internal_notifications.title`
  - `notifications.message -> internal_notifications.body`
  - `notifications.reference_* -> internal_notifications.data`
  - `notifications.is_read/read_at -> internal_notifications.read_at`

### Frontend impact
- Single inbox/alerts view should only rely on `internal_notifications`.

### API impact
- Existing `/v1/internal-notifications/*` stays canonical.
- Add `/v1/legacy/notifications` only if you must support an older client.

---

## 3) `accounting_entries` vs `finance_journal_entries` (simple) vs advanced finance tables

### Current duplicated tables
- **Legacy/advanced ledger candidate**: `accounting_entries` (exists in base SQL)
- **Simple ledger**: `finance_journal_entries` (migration-created, used by `SimpleFinanceController`)
- **Advanced finance operational tables** (used by app):
  - `invoices`, `invoice_items`, `payments`, `expenses`, `fee_assignments`, etc.

### Current code usage
- `finance_journal_entries` is used by `SimpleFinanceController` as a “director notebook”.
- `accounting_entries` appears unused by app code.
- Advanced UI dashboards use `payments/expenses/invoices` sums for finance KPIs (`DashboardDataService`).

### Recommended canonical table
Two-tier canonical model (because they serve different user intents):
- **Canonical for Simple Mode director ledger**: `finance_journal_entries`
- **Canonical for operational finance (invoicing/payments/expenses)**: keep using `invoices + invoice_items + payments + expenses`

Treat `accounting_entries` as legacy until/unless you implement formal accounting.

### Tables to keep as legacy/read-only
- Keep `accounting_entries` read-only (legacy).

### Migration/bridge strategy
- **Phase 0**: ensure `finance_journal_entries` exists (migrations run).
- **Phase 1 (optional write-through)**: if you want a single consolidated export later, create a *reporting view* (SQL view or API-level aggregation) rather than duplicating writes into `accounting_entries`.
- **Phase 2 (future)**: if formal accounting becomes required, decide whether `accounting_entries` becomes canonical and implement deterministic write-through from operational events (payments, expenses, invoice issuance/cancellation).

### Frontend impact
- Simple Mode shows only the “Journal simple” backed by `finance_journal_entries`.
- Advanced finance screens continue using invoices/payments/expenses.

### API impact
- `/v1/simple/finance/*` remains separate and clearly labeled “simple”.
- Add reporting endpoints that aggregate without cross-writing tables.

---

## 4) `invoices` alone vs `invoices + invoice_items`

### Current duplicated/overlapping structures
- `invoices` exists in base SQL.
- `invoice_items` is created by migration and used by the app.

### Current code usage
- `InvoiceController` always writes line items (`InvoiceItem::create(...)`) and recomputes totals.
- `Invoice` model defines `items()` relation.

### Recommended canonical structure
- **Canonical: `invoices + invoice_items`**

### Tables to keep as legacy/read-only
- Keep `invoices` (core) obviously canonical; the “legacy” angle here is the *old assumption* “invoice has only totals, no lines”.

### Migration/bridge strategy
- **Phase 0**: ensure `invoice_items` exists everywhere (migrations run).
- **Phase 1 (safety)**: for any older invoice rows without items, define a read fallback:
  - If no `invoice_items`, treat invoice as “single-line” item = `total_amount` with label `"Total"`.
  - (This is a code change, safe and backward compatible; do later if needed.)

### Frontend impact
- Invoice create UI should always create at least one line item.
- Invoice display should render items, with fallback to a synthetic item only if needed.

### API impact
- Keep current invoice DTO including `items` (already implemented in `InvoiceController::toDto()`).

---

## 5) `documents` + `document_access_logs` structure

### Current structure
- `documents` exists in base SQL and is used by the app.
- `document_access_logs` exists in base SQL but **its column names differ** from app expectations:
  - SQL: `action_type`, `ip_address`, `accessed_at`
  - App: `action`, `ip`, `created_at`

### Current code usage
- `DocumentController` logs access by writing `DocumentAccessLog::create([... action, ip, created_at ...])`.
- `Document` model uses SoftDeletes and expects `documents.deleted_at`.

### Recommended canonical structure
Because logs are append-only and low-risk to extend:
- **Canonical: app-level column contract** (`action`, `ip`, `created_at`) to minimize code churn.
- Keep SQL-native columns (`action_type`, `ip_address`, `accessed_at`) as legacy fields (do not delete).

### Tables/columns to keep as legacy/read-only
- Keep existing SQL columns; treat them as legacy/back-compat.

### Migration/bridge strategy
- Add bridging columns (`action`, `ip`, `created_at`) to `document_access_logs` and backfill them from SQL-native columns (see schema drift audit for an exact migration sketch).
- Optionally later, update code to write both sets during a transition window, then stop using legacy columns.

### Frontend impact
- None (logs are internal), except improved stability for downloads/deletes.

### API impact
- None expected (no public endpoint for access logs currently).

---

## Cross-cutting “safe transition” principles (applies to all domains)

- **Do not delete tables**: keep legacy tables intact.
- **Prefer additive migrations**: add missing tables/columns; avoid renames/drops in phase 1.
- **Backfill only when deterministic**: copy legacy data into canonical only if mapping is unambiguous.
- **Introduce explicit `legacy/*` API surfaces**: makes it clear to clients what is transitional.

