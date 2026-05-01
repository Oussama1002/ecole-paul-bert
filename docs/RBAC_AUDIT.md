# RBAC Audit — Source of Truth Matrix & Gap Analysis

> **Scope**: Cross-reference of backend routes + policies + permission seeder vs. frontend routes + page guards + sidebar gating.
> **Generated**: 2026-04-21 — École Paul Bert v1.
> **Inputs**: `backend-api/routes/api.php`, `backend-api/database/seeders/PermissionSeeder.php`, `backend-api/database/seeders/RolesSeeder.php`, `backend-api/app/Policies/*`, `frontend-admin/src/App.tsx`, `frontend-admin/src/pages/**`, `frontend-admin/src/components/layout/AppSidebar.tsx`, `frontend-admin/src/contexts/AuthContext.tsx`.

---

## A. Source-of-Truth Matrix — Module → Routes → Permissions → UI

Legend: `B` = backend middleware enforces, `F-R` = frontend route guard, `F-A` = frontend action-level guard, `F-N` = frontend nav (sidebar) guard, `✗` = missing, `—` = N/A.

| Module | Perm code | Backend routes (method `URI`) | B | UI page(s) | F-R | F-A | F-N |
|---|---|---|---|---|---|---|---|
| **Auth** | _(auth-only)_ | `POST /auth/login` (public, throttled), `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/reset-password` | ✓ | LoginPage, ForgotPasswordPage, ResetPasswordPage, ChangePasswordPage | — | — | — |
| **Dashboard** | `dashboard.view` | `GET /dashboard` | ✓ | DashboardPage | ✗ (auth-only) | — | — |
| **Users** | `users.view` | `GET /users`, `GET /users/{user}` (policy-only), `GET /roles` | ✓* | UsersListPage | ✓ | — | ✓ |
| | `users.create` | `POST /users` | ✓ | UserFormPage (nouveau) | ✓ | ✓ (new btn) | — |
| | `users.edit` | `PATCH /users/{user}` | ✓ | UserFormPage (editer) | ✓ | ✓ (edit link) | — |
| | `users.deactivate` | ⚠ **route not identified** (expected `POST /users/{user}/deactivate`) | ? | UsersListPage (inline btn) | — | ✓ | — |
| **School years** | `school_years.view` | `GET /school-years` | ✓ | SchoolYearsListPage | ✓ | — | ✓ |
| | `school_years.manage` | `POST/PATCH/DELETE /school-years{/id}`, `POST /school-years/{id}/set-current` | ✓ | SchoolYearFormPage | ✓ | ✓ | — |
| **Levels** | `levels.view` / `.manage` | `GET/POST/PATCH/DELETE /levels` | ✓ | LevelsListPage, LevelFormPage | ✓ | ✓ | ✓ |
| **Classes** | `classes.view` / `.manage` | `GET/POST/PATCH/DELETE /classes` | ✓ | ClassesListPage, ClassFormPage, ClassDetailPage | ✓ | ✓ | ✓ |
| **Subjects** | `subjects.view` / `.manage` | `GET/POST/PATCH/DELETE /subjects` | ✓ | SubjectsListPage, SubjectFormPage | ✓ | ✓ | ✓ |
| **Academic terms** | `academic_terms.view` / `.manage` | `GET/POST/PATCH/DELETE /academic-terms` | ✓ | ParametragePeriodsPage (mixed) | ✓ | ✓ | ✓ |
| **Evaluation periods** | `evaluation_periods.view` / `.manage` | `GET/POST/PATCH/DELETE /evaluation-periods` | ✓ | ParametragePeriodsPage (mixed) | ✓ | ✓ | ✓ |
| **Rooms** | `rooms.view` / `.manage` | `GET/POST/PATCH/DELETE /rooms` | ✓ | RoomsListPage, RoomFormPage | ✓ | ✓ | ✓ |
| **Students** | `students.view` | `GET /students`, `GET /students/{id}`, `GET /students/{id}/history` | ✓ | StudentsListPage, StudentDetailPage | ✓ | — | ✓ |
| | `students.manage` | `POST/PATCH/DELETE /students{/id}` | ✓ | StudentFormPage | ✓ | ✓ | — |
| | `students.import` | `POST /students/import` | ✓ | StudentsListPage btn | — | ✓ | — |
| | `students.export` | `GET /students/export` | ✓ | StudentsListPage btn | — | ✓ | — |
| **Guardians** | `guardians.view` / `.manage` | 6 routes under `/guardians` | ✓ | ⚠ **No dedicated page**, embedded in StudentDetailPage | ✗ | ✗ | ✗ |
| **Enrollments** | `enrollments.view` / `.manage` | `GET/POST/PATCH /enrollments` | ✓ | Embedded in StudentDetailPage | ✗ | ✓ | — |
| **Teachers** | `teachers.view` / `.manage` | `GET/POST/PATCH/DELETE /teachers`, assignments, documents | ✓ | TeachersListPage, TeacherFormPage, TeacherDetailPage | ✓ | ✓ | ✓ |
| **Schedule** | `schedule.view` / `.manage` | `GET/POST/PATCH/DELETE /schedule-entries`, teacher schedule | ✓ | ScheduleWeeklyPage | ✓ | ✓ | ✓ |
| **Attendance** | `attendance.view` | `GET /attendance*` | ✓ | AttendanceStatsPage | ✓ | — | ✓ |
| | `attendance.manage` | `POST /attendance`, bulk marking | ✓ | AttendanceQuickClassPage | ✗ (uses `.view`) | ✗ | — |
| | `attendance.justify` | `POST /attendance/{id}/justify` | ✓ | StudentDetailPage action | — | ✓ | — |
| **Grades** | `grades.view` | `GET /grades*`, `GET /class-ranking` | ✓ | GradesBulkClassPage, ClassRankingPage | ✓ | — | ✓ |
| | `grades.manage` | `POST/PATCH /grades`, bulk endpoints | ✓ | GradesBulkClassPage entry UI | ✗ (uses `.view`) | ✗ | — |
| | `grades.override_lock` | ⚠ **No route found**, **unassigned to any role** | ✗ | ✗ no UI | ✗ | ✗ | — |
| **Report cards** | `report_cards.view` / `.manage` / `.publish` | `GET/POST /report-cards`, `POST /report-cards/{id}/publish` | ✓ | ReportCardsListPage, ReportCardDetailPage | ✓ (view only) | ✗ (publish btn not gated) | ✓ |
| **Finance** | `finance.view` | 23 routes GET under `/fee-types`, `/expense-categories`, `/fee-assignments`, `/invoices`, `/payments`, `/expenses` | ✓ | FinanceDashboardPage, PaymentsListPage | ✓ | — | ✓ |
| | `finance.manage` | All finance POST/PATCH/DELETE (invoice, payment, expense, etc.) | ✓ | PaymentsListPage create btn; **no UI for invoices, fee-assignments, expenses, fee-types, expense-categories** | — | ✗ (create payment) | — |
| **Documents** | `documents.view` / `.manage` | `GET/POST/DELETE /documents` | ✓ | DocumentsPage | ✓ | ✓ | ✓ |
| **Announcements** | `announcements.view` / `.manage` | 5 routes `/announcements` | ✓ | AnnouncementsListPage, AnnouncementFormPage | ✓ | ✓ | ✓ |
| **Notifications** | `notifications.view` | 3 routes `/notifications` | ✓ | NotificationsCenterPage | ✓ | — | — |
| **Audit logs** | `audit_logs.view` | `GET /audit-logs` | ✓ | AuditLogsPage | ✓ | — | ✓ |

*`users.view` is enforced on `/users` via middleware, but `/users/{user}` relies on `UserPolicy@view` which allows self OR `users.view` — intentional.

---

## B. Role → Permission Matrix (from `PermissionSeeder.php`)

| Role (code) | # perms | Notable scope |
|---|---|---|
| `super_admin` (1) | **all 44** via `User::hasPermission()` hardcoded bypass | Full access. Seeder only grants `dashboard.view` — rest comes from bypass. |
| `admin` (2) | **all 44** via seeder | Full access via seeded assignments. |
| `director` (3) | 27 | **View-only** across pedagogy/students/grades. No `.manage`, no finance. |
| `pedagogical_manager` (4) | 27 | Pedagogy/students/grades .view + .manage. No users, no finance. |
| `school_office` (5) | 35 | Students, finance, documents, users, audit + pedagogy. Broadest operational role. |
| `teacher` (6) | 15 | classes.view, subjects.view, students.view, guardians.view, enrollments.view, schedule.view, rooms.view, attendance (view/manage/justify), grades (view/manage), announcements.view, notifications.view, dashboard.view. |
| `accountant` (7) | 4 | `finance.view`, `finance.manage`, `dashboard.view`, `notifications.view`. ⚠ Missing `announcements.view`. |
| `hr` (8) | 5 | `users.view`, `users.edit`, `teachers.view`, `teachers.manage`, + dashboard/announcements/notifications. ⚠ `users.edit` lets HR edit any user, not just teachers. |
| `parent` (9) | 3 | dashboard, announcements, notifications. No portal yet. |
| `student` (10) | 3 | Same as parent. No portal yet. |

---

## C. Gaps, Mismatches, and Risks

Ranked by severity. **🔴 High** = security/data integrity risk. **🟠 Medium** = UX break or silent divergence. **🟡 Low** = cosmetic/naming.

### 🔴 High

1. **Teacher data scope not enforced at query level**
   `teacher` role holds `grades.manage` and `attendance.manage` globally — permission middleware passes for any class. "Teacher sees only their assigned classes" must be enforced in controllers/queries/policies, not permissions. This is checklist item 4.1 and the #1 risk. **Verify `GradeController::store`, `AttendanceController::bulk`, `StudentController::index` apply `assignedClassIds(user)` scope.**

2. **Attendance marking page gated by `attendance.view`, not `.manage`**
   `AttendanceQuickClassPage` route uses `attendance.view` — any viewer (e.g., director) lands on the marking screen and UI offers the "mark" action. Backend rejects with 403, but UX appears broken. **Fix**: split route to require `attendance.manage`, or hide marking controls inside the page via `hasPermission('attendance.manage')`.

3. **Grade entry page gated by `grades.view`, not `.manage`**
   Same shape as #2 on `GradesBulkClassPage`. Directors can open the bulk entry screen and type grades; backend rejects on submit. **Fix**: require `grades.manage` on the entry route or hide the entry grid for viewers.

4. **Report-card publish button not gated**
   `report_cards.publish` permission exists and backend enforces it, but frontend `ReportCardDetailPage` has no page-level check referencing `report_cards.publish`. Need to confirm the publish button is wrapped in `hasPermission('report_cards.publish')`.

5. **PaymentsListPage creates payments without `finance.manage` guard**
   Already flagged by frontend explorer. Viewers (e.g., `finance.view`-only, none in current seed, but accountant has both) can hit the create form. Backend rejects, but: **any future role with `finance.view` alone breaks silently**. **Fix**: gate the "Nouveau paiement" button and the create-form route on `finance.manage`.

### 🟠 Medium

6. **Large finance UI coverage missing**
   Backend exposes full CRUD for `/invoices`, `/fee-assignments`, `/fee-types`, `/expense-categories`, `/expenses` (23 routes), but frontend only has `FinanceDashboardPage` + `PaymentsListPage`. These endpoints are callable via API but have no admin UI — aligns with checklist 8.2/8.3 being partial. **Action**: confirm these are intentionally deferred or add minimal list/form pages.

7. **No dedicated guardians UI**
   `/guardians` module has 6 backend routes + permissions (`guardians.view`, `.manage`) but no page references them in frontend routing. All guardian UX lives inside `StudentDetailPage`. If that embedded UX is incomplete (checklist 3.4), permissions are effectively unreachable for all non-student contexts.

8. **`users.deactivate` has no identified backend route**
   Permission and UI button exist, but backend routes inventory doesn't list an explicit deactivate endpoint. Either it's handled as `PATCH /users/{user}` with a status payload (then `users.edit` would suffice — `users.deactivate` is dead code), or the endpoint is missing. **Action**: verify `UserController::update` vs. a dedicated deactivate action; align both sides.

9. **`grades.override_lock` orphan permission**
   Defined in seeder, assigned to zero roles, referenced in zero routes/pages. Either wire it up (checklist 5.4 period lock/override) or delete it to avoid dead config drift.

10. **Accountant has no `announcements.view`**
    Every other operational role has it. Likely an oversight — accountants should see school announcements. Low impact, but a consistency fix.

11. **HR `users.edit` overly broad**
    HR can edit any user record, not just teachers. If intended, document it. If not, either restrict via a policy scope or introduce `teachers.edit_account` and remove `users.edit` from HR.

12. **No `Gate::before()` super-admin safety net**
    Super-admin bypass lives only in `User::hasPermission()`. If any future code path checks `Gate::allows(...)` or a policy that doesn't route through `hasPermission` (e.g., custom `can()` closures), super-admin is not auto-approved. **Fix**: add `Gate::before(fn ($u) => $u->isSuperAdmin() ?: null)` in `AuthServiceProvider`.

### 🟡 Low

13. **Naming drift on users module**
    Everywhere else is `{module}.view` / `{module}.manage`. Users uses `.view` / `.create` / `.edit` / `.deactivate`. Keep as-is (users are special) or normalize to `.view` / `.manage` + `.deactivate` — decide and document in CONVENTIONS.

14. **11 pages rely solely on route-level guards**
    AttendanceStats, GradesBulkClass, ClassRanking, ReportCardsList/Detail, FinanceDashboard, Notifications, AuditLogs, etc. Acceptable since backend enforces, but action-level gating should be added wherever a destructive button appears in those pages.

15. **`dashboard.view` not checked frontend-side**
    All roles have it, so effectively no-op. But the frontend dashboard page should still call `hasPermission('dashboard.view')` if only to document the contract and fail gracefully for a future role that lacks it.

16. **FormRequests all return `authorize() => true`**
    By design (middleware + policies are the gate). Document this convention so contributors don't mistake it for a gap.

---

## D. Prioritized Remediation (aligned with Block 1 order)

| # | Item | Severity | Files to touch | Est. scope |
|---|---|---|---|---|
| R1 | Verify & enforce teacher data scope on grades, attendance, students queries | 🔴 | `app/Http/Controllers/Api/V1/GradeController.php`, `AttendanceController.php`, `StudentController.php`, new `TeacherScope` trait or policy method | Medium — needs query audit + tests |
| R2 | Gate attendance marking & grade entry screens on `.manage` | 🔴 | `frontend-admin/src/App.tsx` (routes), `AttendanceQuickClassPage.tsx`, `GradesBulkClassPage.tsx` | Small |
| R3 | Gate report-card publish button on `report_cards.publish` | 🔴 | `ReportCardDetailPage.tsx` | Trivial |
| R4 | Gate "Nouveau paiement" on `finance.manage` | 🔴 | `PaymentsListPage.tsx` | Trivial |
| R5 | Resolve `users.deactivate` — either add explicit route + confirm UI wiring, or delete the permission and use `users.edit` | 🟠 | `routes/api.php`, `UserController.php`, `UsersListPage.tsx`, seeder | Small |
| R6 | Decide fate of `grades.override_lock` (wire to period-lock override feature or remove) | 🟠 | `PermissionSeeder.php`, plus R-future in 5.4 | Small now, bigger when wiring |
| R7 | Add `Gate::before()` super-admin bypass in `AuthServiceProvider` | 🟠 | `app/Providers/AuthServiceProvider.php` | Trivial |
| R8 | Grant `announcements.view` to accountant | 🟡 | `PermissionSeeder.php` | Trivial |
| R9 | Audit & fix 11 pages lacking action-level guards (add `hasPermission` wrappers on any destructive/sensitive button) | 🟡 | various pages in `src/pages/**` | Medium |
| R10 | Decide users permission naming (keep `.create`/`.edit`/`.deactivate` or normalize) — document in `docs/RBAC_CONVENTIONS.md` | 🟡 | docs only | Trivial |
| R11 | Verify or build minimal UI for invoices, fee-assignments, expenses, fee-types, expense-categories, guardians | 🟠 | many new pages | Large — defer to checklist 8.2/3.4 work |
| R12 | Build RBAC test suite (checklist 1.3): one feature test per role × critical action, asserting 403 on forbidden | 🔴 (prevents regressions) | `tests/Feature/Permissions/*` | Medium-Large |

---

## E. Next steps

Propose executing in this order (each ships independently):

1. **R2 + R3 + R4 + R7 + R8** — all trivial, together close 4 of 5 high/medium gaps in a single afternoon.
2. **R5 + R6 + R10** — housekeeping; align naming and remove dead config.
3. **R1** — scope audit; biggest code change; needs careful testing.
4. **R12** — lock it all in with feature tests before moving to next Block-1 item (3.1 one-main-class-per-year).

After R1–R12, Block 1 item 1.2 (RBAC hardening) is complete and we can move to **3.1 — one main class per student per school year**.
