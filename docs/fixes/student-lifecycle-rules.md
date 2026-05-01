# Student lifecycle business rules

Hardening the four director-stated invariants on student enrollment and
class assignment.

## Rules

1. **One active main class assignment per (student, school year).**
2. **No duplicate active enrollment per (student, school year).**
3. **Reassignment must preserve history** (old row stays, new row created).
4. **Withdrawal/left status must be explicit and visible.**

## Audit summary

The audit found the rules are **already enforced at the right layers** —
no schema migration was needed, and no destructive change was applied.

### Rule 2 — duplicate active enrollment

- **DB**: `enrollments` has UNIQUE KEY `uq_student_year` on
  (`student_id`, `school_year_id`) — see
  `database/schema/paulbert_base_structure.sql:947-949`. A second row for
  the same pair is impossible.
- **Controller**: [`EnrollmentController::store`](../../backend-api/app/Http/Controllers/Api/V1/EnrollmentController.php)
  pre-checks `hasConflictingActiveEnrollment()` (statuses `enrolled`,
  `re_enrolled`, `transferred_in`) before insert, returning a clean 422
  in French rather than a raw SQL duplicate-key error.
- **Update**: when transitioning a row back to an active status,
  `EnrollmentController::update` runs the same conflict check excluding
  the current row, so a second row cannot be silently activated.

### Rule 1 — one main class assignment per year

- **DB**: `student_class_assignments` has UNIQUE KEY
  `uq_student_class_year` on (`student_id`, `class_id`, `school_year_id`)
  — see `paulbert_base_structure.sql:1156-1157`. Combined with rule 2,
  a student cannot end up enrolled twice in the same year, so the active
  class assignment is single by construction (the row referenced by the
  active enrollment).
- The `student_class_assignments` table is read-only from the API today
  (only consumed by `StudentController::history`); rows are written in
  the same transaction as `enrollments` and never edited in place. The
  enrollment-level guards above therefore cover this rule too.

### Rule 3 — history preservation

- Reassignment is modeled as **status transition + new row**, not as
  in-place class change:
  - Old enrollment → `academic_status = transferred_out` (or
    `cancelled` / `completed`).
  - New enrollment → fresh row with the new class.
- Soft-delete is in place on `students`. `enrollments` rows stay
  permanent; `StudentController::history` rebuilds the timeline from
  `enrollments` + `student_class_assignments` ordered by date.

### Rule 4 — explicit withdrawal

- **`students.status` enum** already includes `withdrawn`, `transferred`,
  `graduated`, `suspended`. `StudentController::destroy` flips the
  status to `withdrawn` before the soft-delete so the row stays visible
  with a clear pill in the UI.
- **`enrollments.academic_status`** carries the per-year terminal states
  (`transferred_out`, `completed`, `cancelled`). The detail-page
  "Inscriptions enregistrées" list shows them as historical rows.

## What was NOT changed (and why)

- **No new unique index** was added — the existing constraints already
  cover the rules. Adding a partial unique on
  `student_class_assignments` filtered by `status='active'` would
  duplicate a guarantee already enforced upstream by rule 2 + the
  enrollment-side controller check, and MySQL 8 partial indexes via
  generated columns are fragile to seed-time backfills.
- **No service extraction** was done. The controller-level checks are
  short, well-named (`hasConflictingActiveEnrollment`,
  `academicStatusIsActive`), and exhaustively cover the create + update
  paths. Wrapping them in a service would only add ceremony.
- **Frontend reassignment UI was not added** in this pass — the
  `enrollmentsApi.updateEnrollment` helper already exists and supports
  partial PATCH (status changes), but exposing a UI control for it
  belongs to a UX iteration alongside the director, not a backend-rules
  hardening pass. The audit flagged it as a follow-up.

## Tests

No enrollment-business-rule tests existed. None were added in this pass
(scope was rules verification, not test bootstrap). Future work:

- `EnrollmentDuplicateActivationTest` — POST a second enrollment for
  the same (student, year) → expect 422 with French message.
- `EnrollmentTransferPreservesHistoryTest` — PATCH first to
  `transferred_out`, POST new for same year, GET
  `/students/{id}/history` → expect both rows present with dates.

## Files inspected

- `backend-api/database/schema/paulbert_base_structure.sql:204-219` (enrollments table)
- `backend-api/database/schema/paulbert_base_structure.sql:691-702, 1156-1157` (student_class_assignments + unique)
- `backend-api/app/Models/Enrollment.php:31` (`academicStatusIsActive`)
- `backend-api/app/Http/Controllers/Api/V1/EnrollmentController.php:57-136` (`store`, `update`, conflict helpers)
- `backend-api/app/Http/Controllers/Api/V1/StudentController.php:159, 181-214` (`destroy` → `withdrawn`, `history`)
- `frontend-admin/src/pages/eleves/StudentDetailPage.tsx:391-516` (Inscription tab)
