# Quick student creation — simple-mode flow

The director wants a one-minute student capture with the absolute minimum
fields. This file documents how that flow is wired and what was polished
in this pass.

## What the director sees (simple mode ON)

Route: `/eleves/nouveau` (the same URL as the advanced form). When
`simpleMode === true`, [`StudentFormPage`](../../frontend-admin/src/pages/eleves/StudentFormPage.tsx)
short-circuits and renders [`QuickStudentForm`](../../frontend-admin/src/pages/eleves/QuickStudentForm.tsx)
instead of the full form. No new route was added — toggling the simple-mode
switch in the topbar swaps the experience in place.

Fields shown:

- **Identité**: prénom *, nom *, date de naissance *, code/matricule *
  (auto-suggested from `/v1/students/next-code`, regenerable with the
  "Auto" button).
- **Téléphones des parents**: parent 1, parent 2, autre contact (at least
  one required).
- **Adresse**: free-text textarea.

Everything else (gender, nationality, médical, status, admission_date,
emergency contact, notes, …) is hidden. The backend persists those
columns as `null`/`pending`; switching to advanced mode later lets the
secretary complete the file without losing data.

## Validation

**Frontend** (`QuickStudentForm.tsx`):
1. `first_name`, `last_name` — non-empty.
2. `date_of_birth` — required (matches backend rule `before:today`).
3. `student_code` — required, trimmed.
4. At least one of `parent_phone_1/2/3` — required (school must be able
   to reach a parent).

**Backend** (`StoreStudentRequest`):
- `student_code` — `required|string|max:50|unique:students,student_code (whereNull deleted_at)`
- `first_name`, `last_name` — `required|string|max:100`
- `date_of_birth` — `required|date|before:today`
- `parent_phone_1/2/3`, `address` — `nullable`
- All other fields — `nullable` / `sometimes`, so omitting them in the
  Quick form is safe.

The `messageFromFailedApiPayload` helper already extracts the first 422
field error, so a duplicate `student_code` surfaces as the backend's
French message ("Le code élève est déjà utilisé.") instead of a generic
"Une erreur est survenue".

No backend changes were needed — the existing rules already accept the
Quick payload.

## Parent phone storage

Two parallel systems exist in this project:

- **Simple**: 3 columns directly on `students` (`parent_phone_1`,
  `parent_phone_2`, `parent_phone_3`) — added by migration
  `2026_04_21_000010_add_parent_phones_to_students.php`.
- **Advanced**: full `guardians` + `student_guardians` pivot for
  multi-attribute guardian records (relationship, email, can_pickup, …).

QuickStudentForm writes to the **simple** columns only. This is the
"simplest safe way" the spec asked for — no orphan guardian rows, no
pivot bookkeeping, and the secretary can promote a phone to a full
guardian record later from advanced mode.

## After-creation UX (this pass)

Previously the form navigated back to `/eleves` (the list) on success —
the director couldn't tell what just happened. Now:

- **Create** → navigate to `/eleves/{id}` (the new student's profile)
  with `location.state.flash = "Élève {Prénom Nom} enregistré."`.
- **Update** → still returns to `/eleves` with a "Fiche mise à jour."
  flash.

[`StudentDetailPage`](../../frontend-admin/src/pages/eleves/StudentDetailPage.tsx)
renders the flash as a green banner above the hero, auto-dismisses it
after 5s, and clears the history state so a refresh doesn't show it
again.

Errors stay inline at the top of the form, in the existing coral alert
box, populated from `getApiErrorMessage` so duplicate-code and other 422
field errors come through verbatim from Laravel.

## Files touched

- [`frontend-admin/src/pages/eleves/QuickStudentForm.tsx`](../../frontend-admin/src/pages/eleves/QuickStudentForm.tsx)
  — added phone-required validation; navigate to the new student's
  profile with a flash on create success.
- [`frontend-admin/src/pages/eleves/StudentDetailPage.tsx`](../../frontend-admin/src/pages/eleves/StudentDetailPage.tsx)
  — read `location.state.flash`, show a 5-second success banner, then
  scrub the state.

No backend, schema, or API-client changes were needed.

## Verification

- `npx tsc --noEmit` passes.
- Manual smoke (simple mode ON): `/eleves/nouveau` shows the 4-section
  Quick form. Submitting with no phone surfaces "Indiquez au moins un
  téléphone parent." Submitting with a duplicate code surfaces the
  backend's unique-constraint French message. Submitting valid data
  lands on `/eleves/{id}` with the green success banner.
