# Simple Mode — Architecture & Rollout

École Paul Bert ships with a full ERP (students, teachers, schedule, grades,
attendance, finance, parametrage, audit, RBAC, exports…). For the day-to-day
primary-school users (directrice, secrétariat) that feature surface is too
dense. **Simple Mode** is an opt-in UX layer that hides technical screens and
secondary fields while keeping the advanced backend 100% intact.

- `simple` → minimal screens, minimal fields, fast to use
- `advanced` → full ERP (current behavior, unchanged)

The mode is **global** (one flag for the whole school) and persisted in the
database. It is **not** a security boundary — RBAC / permissions still gate
every action. Simple Mode is purely a UX simplification.

---

## 1. Data model

Table `app_settings` stores generic key/value app flags.

```82:87:backend-api/database/migrations/2026_04_21_000000_create_app_settings_table.php
$table->id();
$table->string('key', 120)->unique();
$table->text('value')->nullable();
$table->string('type', 20)->default('string'); // string|bool|int|json
$table->unsignedBigInteger('updated_by')->nullable();
$table->timestamps();
```

Seeded row:

| key                    | type | value |
|------------------------|------|-------|
| `simple_mode_enabled`  | bool | `1`   |

The column `updated_by` is a plain `unsignedBigInteger` (no FK) because the
legacy `users` table dumped by `paulbert_base_structure.sql` doesn't always
carry a real PRIMARY KEY; keeping it unconstrained makes the migration safe
on both the fresh schema and the legacy dump.

### Model

`app/Models/AppSetting.php` provides `AppSetting::get($key, $default)` and
`AppSetting::set($key, $value, $userId, $type)` with 5-minute cache. Cast
types: `string | bool | int | json`.

---

## 2. API

Both endpoints live under `/api/v1` and require `auth:sanctum` + `throttle:api`
(see `backend-api/routes/api.php`, lines 57–60).

### `GET /v1/app-settings`

Any authenticated user. Returns:

```json
{
  "success": true,
  "data": { "simple_mode_enabled": true },
  "message": "Paramètres applicatifs."
}
```

### `PATCH /v1/app-settings`

Admin-only (super_admin or admin role). Payload:

```json
{ "simple_mode_enabled": false }
```

Returns the updated settings object. Non-admins get `403`. The controller is
`App\Http\Controllers\Api\V1\AppSettingController`.

### Dashboard split

Two dashboard payloads are exposed:

- `GET /v1/dashboard` — full admin/teacher/accountant KPIs (unchanged)
- `GET /v1/dashboard/simple` — 6 KPIs + 6-month revenue trend (for
  `SimpleDashboardPage`)

Both require `dashboard.view` permission.

---

## 3. Frontend architecture

### 3.1 Context — `SimpleModeContext`

`frontend-admin/src/contexts/SimpleModeContext.tsx` exposes:

```ts
{
  simpleMode: boolean        // current effective mode
  ready: boolean             // true once the server flag has been fetched
  canToggle: boolean         // true for super_admin / admin
  setSimpleMode(value): Promise<void>
}
```

Behavior:

1. On mount, reads `localStorage.paulbert_simple_mode` (default `true`) so the
   first paint is never blank.
2. Once auth is `ready` and a user is logged-in, fetches
   `GET /v1/app-settings`; updates the flag + localStorage.
3. `setSimpleMode(v)` is optimistic — UI flips immediately, then PATCHes the
   server (admin only). On failure, it re-reads from server.

### 3.2 Layout swap

`frontend-admin/src/layouts/AdminLayout.tsx`:

```11:14:frontend-admin/src/layouts/AdminLayout.tsx
return (
  <div className="school-page-bg flex min-h-screen font-sans text-school-ink">
    {simpleMode ? <SimpleSidebar /> : <AppSidebar />}
```

- `SimpleSidebar` → 7 links: Accueil, Élèves, Absences, Bulletins, Caisse,
  Enseignants, Annonces.
- `AppSidebar` → full nav (20+ links incl. parametrage, audit, emploi-du-temps).

### 3.3 Dashboard swap

`App.tsx` uses a small `DashboardHome` wrapper:

```54:57:frontend-admin/src/App.tsx
function DashboardHome() {
  const { simpleMode } = useSimpleMode()
  return simpleMode ? <SimpleDashboardPage /> : <DashboardPage />
}
```

`SimpleDashboardPage` shows 6 colorful KPI tiles + a 6-month revenue bar chart.
`DashboardPage` shows alerts, attendance charts, averages by class, unpaid
summaries, shortcuts, etc.

### 3.4 Header toggle

`frontend-admin/src/components/layout/AppHeader.tsx` shows a two-state pill
"Simple / Avancé" when `canToggle` is true (admin roles). Flips instantly and
persists server-side.

### 3.5 Route-level guard — `RequireAdvancedMode`

`frontend-admin/src/routes/RequireAdvancedMode.tsx` redirects back to `/`
whenever a user lands on an advanced-only URL while simple mode is active.
Used in `App.tsx` around:

- `assiduite/stats`
- `notes/saisie-classe` (saisie de notes par classe — ERP dense)
- `notes/classement`
- `communications/audit`
- `emploi-du-temps`
- `utilisateurs`, `utilisateurs/nouveau`, `utilisateurs/:id/editer`
- All `parametrage/*` (annees-scolaires, niveaux, classes, matieres, periodes, salles)

This is a UX guard, **not** an access-control one — RBAC still enforces the
real permissions.

### 3.6 Per-page simplifications

Pages that stay visible in simple mode but become lighter:

- `pages/eleves/StudentsListPage.tsx`
  - Filter form collapses from **5 fields** (search + status + year + level +
    class) to **1 field** (search only).
  - Secondary actions hidden: Import CSV/Excel, Export CSV. A single "Exporter
    (Excel)" button remains for exports.
  - Table drops the `Code` (student_code) and `Statut` columns — only Nom,
    Prénom, Actions remain.

- `pages/finance/PaymentsListPage.tsx`
  - Top filter drops the technical "Filtre facture (ID)" column.
  - "Nouveau paiement" form drops the optional "Facture (ID)" field.

Add more simplifications with the same pattern: `const { simpleMode } =
useSimpleMode()`, then branch the JSX.

---

## 4. UX contract for Simple Mode

| Principle              | Implementation                                      |
|------------------------|-----------------------------------------------------|
| Minimal sidebar        | 7 essentials only (see `SimpleSidebar`)             |
| One-glance dashboard   | 6 KPI tiles + single revenue chart                  |
| Plain French labels    | "Élèves", "Absences", "Caisse", "Bulletins"…        |
| No technical IDs       | Hide `student_code`, `invoice_id`, `facture ID`…   |
| One primary action     | Each screen has at most one big button (Nouvel élève, Exporter…) |
| No secondary tabs      | Audit logs, emploi-du-temps, parametrage hidden     |
| No advanced filters    | Search-only on most lists                           |
| Admin escape hatch     | Toggle pill in the header (admin only)              |

---

## 5. Files created/updated

### Backend

| File                                                                                | Change    |
|-------------------------------------------------------------------------------------|-----------|
| `backend-api/database/migrations/2026_04_21_000000_create_app_settings_table.php`   | creates `app_settings` + seeds `simple_mode_enabled=1` |
| `backend-api/app/Models/AppSetting.php`                                             | key/value model with cache |
| `backend-api/app/Http/Controllers/Api/V1/AppSettingController.php`                  | `GET/PATCH /v1/app-settings` |
| `backend-api/app/Http/Controllers/Api/V1/DashboardController.php`                   | `simple()` action for light dashboard |
| `backend-api/routes/api.php`                                                        | registers `/app-settings` and `/dashboard/simple` |

### Frontend

| File                                                              | Change  |
|-------------------------------------------------------------------|---------|
| `frontend-admin/src/api/appSettings.ts`                           | `fetchAppSettings`, `updateAppSettings` |
| `frontend-admin/src/api/dashboard.ts`                             | `fetchSimpleDashboard` + types |
| `frontend-admin/src/contexts/SimpleModeContext.tsx`               | provider + hook |
| `frontend-admin/src/components/layout/SimpleSidebar.tsx`          | compact nav |
| `frontend-admin/src/pages/SimpleDashboardPage.tsx`                | compact dashboard |
| `frontend-admin/src/layouts/AdminLayout.tsx`                      | swaps sidebar on `simpleMode` |
| `frontend-admin/src/components/layout/AppHeader.tsx`              | Simple/Avancé toggle |
| `frontend-admin/src/routes/RequireAdvancedMode.tsx`               | **NEW** route guard |
| `frontend-admin/src/App.tsx`                                      | `DashboardHome` swap + `RequireAdvancedMode` around advanced routes |
| `frontend-admin/src/pages/eleves/StudentsListPage.tsx`            | simplified filters / actions / columns |
| `frontend-admin/src/pages/finance/PaymentsListPage.tsx`           | hidden invoice-id filter + form field |

---

## 6. Rollout plan

1. **DB** — on the target deployment run:

   ```powershell
   cd backend-api
   php artisan migrate --force
   ```

   The migration is idempotent (`Schema::hasTable('app_settings')` guard) and
   seeds `simple_mode_enabled = 1` via `updateOrInsert`, so re-running is safe.

2. **Front build** — rebuild:

   ```powershell
   cd frontend-admin
   npm run build
   ```

3. **First login** — the flag `simple_mode_enabled = 1` is already seeded, so
   every user lands in Simple Mode by default. No action required.

4. **Admin opt-out** — Super admin / admin sees the "Simple / Avancé" toggle
   in the header and can flip the whole school into advanced mode with a single
   click. The choice is stored server-side, so every user in the school sees
   the same mode after refresh.

5. **Per-device fallback** — if the `/v1/app-settings` call fails (offline,
   transient 5xx), the front uses the last value cached in
   `localStorage.paulbert_simple_mode` so the UI never regresses mid-session.

---

## 7. Safety guarantees

- No existing component is removed. `DashboardPage`, `AppSidebar`,
  `StudentsListPage`'s advanced filters etc. remain in the codebase and are
  reachable in Advanced Mode.
- Simple Mode changes **only** the UI surface. All backend endpoints, RBAC
  rules, audit logs, validation, exports and reports stay identical.
- The `RequireAdvancedMode` guard redirects to `/` (not 403) when a user
  lands on a hidden page. RBAC is still the source of truth for real 403s.
- The `app_settings` row is cached (5 min) — toggling from the header busts
  the cache via `Cache::forget('app_setting:simple_mode_enabled')` inside
  `AppSetting::set()`.

---

## 8. Adding Simple-Mode awareness to a new page

```tsx
import { useSimpleMode } from '../../contexts/SimpleModeContext'

export function MyPage() {
  const { simpleMode } = useSimpleMode()

  return (
    <div>
      {/* always visible, but simpler in simple mode */}
      <h1>{simpleMode ? 'Mes élèves' : 'Gestion des élèves'}</h1>

      {/* only in advanced */}
      {!simpleMode && <AdvancedFiltersBar />}
      {!simpleMode && <ImportButton />}

      {/* core content is always rendered */}
      <StudentsTable compact={simpleMode} />
    </div>
  )
}
```

For a whole page that shouldn't exist in simple mode, wrap its route in
`<RequireAdvancedMode>` (see `App.tsx`).
