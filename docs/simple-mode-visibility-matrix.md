## Simple Mode visibility matrix (director-first)

Definition:
- **Simple Mode** = minimal, fast day-to-day workflow for a primary school director.
- **Advanced Mode** = full ERP features (kept, but hidden in Simple Mode UX).
- **Security** is still enforced by backend permissions; Simple Mode is a UX layer + route guards.

Legend:
- **Visible (Simple)**: appears in Simple sidebar and/or main flows
- **Hidden (Simple)**: removed from navigation and blocked by `RequireAdvancedMode` route guard
- **Advanced-only actions**: still available in Advanced Mode; not removed

---

## Dashboard
- **Visible (Simple)**: yes (`/` → `SimpleDashboardPage`)
- **Hidden (Simple)**: advanced dashboard widgets/views if any
- **Advanced-only actions**: none (read-only KPIs)
- **Required permissions**: `dashboard.view`

## Students
- **Visible (Simple)**: yes (`/eleves`, `/eleves/nouveau`, detail/edit)
- **Hidden (Simple)**: none (students are core)
- **Advanced-only actions**: none
- **Required permissions**:
  - view: `students.view`
  - create/edit: `students.manage`

## Teachers
- **Visible (Simple)**: yes (`/enseignants`, details)
- **Hidden (Simple)**: teacher assignments/planning tabs inside detail view (UI-level; tabs marked `simple: false`)
- **Advanced-only actions**: subject/class assignments, schedule view, planning management
- **Required permissions**:
  - view: `teachers.view`
  - manage: `teachers.manage`

## Attendance
- **Visible (Simple)**: yes (`/assiduite/marquage` → `SimpleAttendancePage`)
- **Hidden (Simple)**: attendance stats page (`/assiduite/stats` guarded)
- **Advanced-only actions**: deep analytics / exports
- **Required permissions**:
  - view: `attendance.view`
  - manage: `attendance.manage`

## Grades / Bulletins
- **Visible (Simple)**: yes Bulletins (`/bulletins`)
- **Hidden (Simple)**:
  - grades entry bulk/class (`/notes/saisie-classe`) guarded
  - ranking page (`/notes/classement`) guarded
  - report card template editor (`/parametrage/bulletin-template`) guarded
  - bulletin filtering by status (UI hides status filter in Simple Mode)
- **Advanced-only actions**:
  - grade entry, ranking analytics, bulletin template editing
  - publish/archive buttons in bulletin detail page (hidden in Simple Mode)
- **Required permissions**:
  - bulletins view: `report_cards.view`
  - generation/manage: `report_cards.manage`
  - publish: `report_cards.publish`
  - grades view/manage: `grades.view` / `grades.manage`

## Finance
- **Visible (Simple)**: yes (`/finance` → `SimpleFinancePage`)
- **Hidden (Simple)**:
  - payments list, invoices list, expenses list (`/finance/*`) guarded
  - advanced finance setup pages (fee types, categories, assignments) via guarded routes
- **Advanced-only actions**: invoicing, payment processing, expense management, reporting
- **Required permissions**:
  - view: `finance.view`
  - manage: `finance.manage`

## Documents
- **Visible (Simple)**: yes (`/documents`)
- **Hidden (Simple)**: none (documents are core)
- **Advanced-only actions**: none (uploads/downloads are allowed per permissions)
- **Required permissions**: `documents.view` (and implicitly upload/delete per backend)

## Settings
- **Visible (Simple)**: yes, *basic school settings* (`/ecole/parametres`)
- **Hidden (Simple)**: parametrage module (years/levels/classes/subjects/periods/rooms/template) via guarded routes
- **Advanced-only actions**: full configuration

## Users / Roles
- **Visible (Simple)**: no (routes guarded)
- **Hidden (Simple)**: users CRUD (`/utilisateurs/*`) guarded
- **Advanced-only actions**: user management, permissions/roles
- **Required permissions**: `users.view`, `users.create`, `users.edit`

## Timetable
- **Visible (Simple)**: no (route guarded)
- **Hidden (Simple)**: schedule weekly (`/emploi-du-temps`) guarded
- **Advanced-only actions**: scheduling
- **Required permissions**: `schedule.view`

## Communications
- **Visible (Simple)**: yes, announcements (`/communications/annonces`)
- **Hidden (Simple)**: audit logs page (`/communications/audit`) guarded
- **Advanced-only actions**: audit browsing
- **Required permissions**:
  - announcements view/manage: `announcements.view` / `announcements.manage`
  - notifications inbox: `notifications.view`
  - audit logs: `audit_logs.view`

---

## Implementation status
- **Navigation**:
  - Simple sidebar (`SimpleSidebar`) exposes only essentials.
  - Advanced sidebar (`AppSidebar`) is shown only in advanced mode.
- **Route protection**:
  - `RequireAdvancedMode` is applied to advanced-only pages so bookmarks/URLs don’t leak complexity into Simple Mode.

