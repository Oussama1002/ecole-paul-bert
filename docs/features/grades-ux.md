# Grades UX — usable by non-technical staff

V1 director ask: the grade-entry screens were unusable for an
office secretary because they exposed numeric IDs, native dropdowns
that listed hundreds of items unsorted, no flow guidance, and no
visible signal when an evaluation period was closed. A user could
type a perfectly valid grade, hit Save, and get a wall-of-text
500-style error because the period had been locked an hour earlier.

This pass fixes the bulk-grade screen to be safe and self-explanatory.

## What changed

[`GradesBulkClassPage`](../../frontend-admin/src/pages/notes/GradesBulkClassPage.tsx)

1. **Searchable selects, names not IDs.** The three flow inputs (year,
   class, period) now use the shared `SearchSelect` component instead
   of native `<select>`. Subjects already used it. Each option shows a
   human label (`6ème A`, `Trimestre 1`) plus a small hint (`En
   cours`, `🔒 Clôturée`). No numeric IDs anywhere in the UI.
2. **Numbered flow.** Labels read `1. Année scolaire` →
   `2. Classe` → `3. Période`, then the matière block, then the
   roster. Each step's input is disabled with a contextual placeholder
   (`Année d'abord`) until its prerequisite is filled, so the user
   cannot skip ahead.
3. **Lock awareness.**
   - The selected period's `is_closed` is read from the periods query.
   - When closed, a banner appears above the matière row.
   - For users **without** `grades.override_lock`: the banner is
     amber, the score and appreciation inputs are disabled and
     greyed-out, and the Save button is disabled — clear visual proof
     that nothing they type can be saved, *before* they type it.
   - For users **with** `grades.override_lock`: the banner is indigo
     and reads "Vous pouvez encore enregistrer (permission
     « grades.override_lock »)." Inputs and Save remain active.
4. **Validation messages.** The mutation's `onError` now runs through
   the shared `getApiErrorMessage()` helper, so the user sees the
   server's French validation message ("La note dépasse la note
   maximale.") instead of an axios stack-trace string.

## Backend defense-in-depth (unchanged, recapped)

The frontend lock is a UX guardrail, not a security boundary. The
backend still calls
[`GradeController::ensurePeriodNotClosed()`](../../backend-api/app/Http/Controllers/Api/V1/GradeController.php)
on every write path — store, update, bulk store. That helper:

- Loads the `EvaluationPeriod` and reads `is_closed`.
- If closed, checks the caller's `grades.override_lock` permission.
- If the permission is absent, throws a `ValidationException` with the
  message rendered above.

So even if a user with browser dev-tools edits the disabled state in
the DOM and submits, the API still returns 422 and the row is not
written.

## Files touched

- [`frontend-admin/src/pages/notes/GradesBulkClassPage.tsx`](../../frontend-admin/src/pages/notes/GradesBulkClassPage.tsx)
  — selectors → `SearchSelect`, lock banner, disabled inputs/save when
  blocked, friendly error messages.

## Files relied on (already in place)

- [`frontend-admin/src/components/ui/SearchSelect.tsx`](../../frontend-admin/src/components/ui/SearchSelect.tsx)
- [`frontend-admin/src/contexts/AuthContext.tsx`](../../frontend-admin/src/contexts/AuthContext.tsx) — `hasPermission()`
- [`frontend-admin/src/utils/apiError.ts`](../../frontend-admin/src/utils/apiError.ts) — `getApiErrorMessage()`
- [`backend-api/app/Http/Controllers/Api/V1/GradeController.php`](../../backend-api/app/Http/Controllers/Api/V1/GradeController.php) — `ensurePeriodNotClosed()`

## Verification

- `tsc --noEmit` clean on the frontend.
- Manual:
  - Pick a closed period as a user without `grades.override_lock` →
    amber banner, inputs greyed, Save button disabled.
  - Same screen as a director (with the override permission) → indigo
    banner, inputs editable, Save active. Submitting writes the
    grades.
  - Pick a non-closed period → no banner, normal flow.
  - Switching the year clears class + period selections so the user
    cannot accidentally save a class from another year against this
    year's period.

## Out of scope for this pass

- The `GradeEntryPage` (single-grade form) and the rankings page were
  not refactored — they already use `SearchSelect` for student/subject
  pickers and are read-only with respect to the period lock for the
  one-by-one entry workflow. They will be reviewed in a follow-up if
  the director surfaces a complaint.
