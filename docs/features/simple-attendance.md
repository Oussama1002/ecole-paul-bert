# Simple-mode attendance — finalized

V1 director ask: a one-screen, checkbox-style attendance flow that
covers **both students and teachers**, surfaces a **monthly absence
total** next to each name, and shields office staff from the
power-user advanced fields (term, schedule entry, subject, justification
notes, minutes late…).

This pass closes the remaining gaps. The student side already shipped;
the teacher side now sits in the same screen behind a tab toggle, and
both sides are protected from accidental duplicate inserts at the
backend.

## UX

- One screen at `assiduite/marquage` in simple mode →
  [`SimpleAttendancePage`](../../frontend-admin/src/pages/assiduite/SimpleAttendancePage.tsx).
- Top-of-screen tab toggle: **👧 Élèves** / **👩‍🏫 Enseignants**.
- Every row is a two-state pill: **✓ Présent** / **✕ Absent**. Late /
  partial-day / minutes-late inputs are intentionally hidden — they
  remain available only via the advanced screen
  (`AttendanceQuickClassPage`).
- "Tous présents" button preloads the optimistic default (the common
  case is "almost everyone is here").
- A right-hand column shows **monthly absences** so the user sees who
  has been missing repeatedly *without* leaving the screen.
- A sticky "Enregistrer" FAB submits the whole roster in one tap.
- Date quick-jumps: Hier / Aujourd'hui / Demain.

## Backend

### Students

- Reads use the existing
  [`SimpleAttendanceController::studentTotals`](../../backend-api/app/Http/Controllers/Api/V1/SimpleAttendanceController.php)
  — `GET /v1/simple/attendance/students?class_id&month=YYYY-MM`,
  permission `attendance.view`.
- Writes go through the standard bulk path:
  [`AttendanceRecordController::bulkMark`](../../backend-api/app/Http/Controllers/Api/V1/AttendanceRecordController.php),
  permission `attendance.manage`.
- **Duplicate prevention**: `upsertBulk()` uses
  `AttendanceRecord::updateOrCreate($match, $data)` keyed on
  `(student_id, attendance_date, class_id|schedule_entry_id, subject_id)`.
  Re-marking the same day for the same student updates the existing
  row rather than inserting a second.

### Teachers

- Dedicated `teacher_attendances` table — one row per teacher per day,
  unique on `(teacher_id, attendance_date)`.
- Endpoints (all under `/v1/simple/attendance/teachers`):
  - `GET /day?date=YYYY-MM-DD` → roster pre-filled with existing
    statuses (`teacherDay`).
  - `GET ?month=YYYY-MM` → daily records + per-teacher totals
    (`teacherList`).
  - `POST` → upsert one row (`teacherUpsert`,
    `attendance.manage`).
  - `DELETE /{id}` → remove one row (`teacherDestroy`,
    `attendance.manage`).
- **Duplicate prevention**: `teacherUpsert` uses
  `TeacherAttendance::updateOrCreate(['teacher_id', 'attendance_date'],
  …)`. The DB-side unique index is the second layer.

## Filters

- **Year + class** for students (year defaulted to current).
- **Date** for both panels; the month derived from the date drives the
  monthly-totals query — no separate "month" picker, no opportunity to
  desync the two.
- Teacher panel needs no class filter (school-wide roster).

## Files touched (this pass)

- [`frontend-admin/src/pages/assiduite/SimpleAttendancePage.tsx`](../../frontend-admin/src/pages/assiduite/SimpleAttendancePage.tsx)
  — added the tab toggle and the `TeachersPanel` component (daily roster
  + monthly absence column + sticky save FAB).

## Files relied on (already shipped earlier in this session)

- [`backend-api/app/Http/Controllers/Api/V1/SimpleAttendanceController.php`](../../backend-api/app/Http/Controllers/Api/V1/SimpleAttendanceController.php)
- [`backend-api/app/Http/Controllers/Api/V1/AttendanceRecordController.php`](../../backend-api/app/Http/Controllers/Api/V1/AttendanceRecordController.php)
- [`frontend-admin/src/api/simpleAttendance.ts`](../../frontend-admin/src/api/simpleAttendance.ts)

## Verification

- TS build clean on the modified page.
- Manual:
  - Toggle "Enseignants" tab → roster loads pre-filled with today's
    statuses (all "Présent" if no record yet).
  - Mark a teacher absent → "Enregistrer" → row inserted; reload →
    state preserved; mark same teacher present and re-save → existing
    row updated, no duplicate.
  - Switch to "Élèves" tab, mark a class, save twice in a row → second
    save updates the first set, no duplicate rows in
    `attendance_records`.
  - Monthly absence column reflects the new totals after save.
