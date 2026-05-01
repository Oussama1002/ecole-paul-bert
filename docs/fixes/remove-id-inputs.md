# Remove manual numeric ID inputs from client-facing UI

P0 usability fix. End users should never be asked to type a numeric primary
key (subject_id, class_id, …). All client-facing forms now use a searchable
select that fetches its options from the API and displays human-readable
labels while keeping the ID internally for submission.

## Audit summary

The frontend was searched for raw numeric ID inputs (`<input type="number">`
bound to `*_id` state) in user-facing forms. Most priority screens were
already using `<select>` populated from the API:

- `pages/assiduite/AttendanceQuickClassPage.tsx` — OK (selects)
- `pages/assiduite/SimpleAttendancePage.tsx` — OK (selects)
- `pages/emploi-du-temps/ScheduleWeeklyPage.tsx` — OK (selects: class, subject, teacher, room)
- `pages/finance/SimpleFinancePage.tsx` — OK (no FK pickers)
- `pages/finance/InvoicesListPage.tsx` — OK (student picker already in place)
- `pages/bulletins/ReportCardsListPage.tsx` — OK (read-only)

Two forms still required raw numeric IDs and have been fixed.

## Fixed screens

| Screen | File | Field | Replacement |
|--------|------|-------|-------------|
| Saisie notes (bulk classe) | `frontend-admin/src/pages/notes/GradesBulkClassPage.tsx` | `subject_id` (was `<input type="number">` labelled "Matière (ID)") | `SearchSelect` fed by `subjectsApi.fetchSubjects`, label = subject name, hint = code |
| Nouvelle annonce / édition | `frontend-admin/src/pages/communications/AnnouncementFormPage.tsx` | `class_id` (shown when audience = "Une classe", was `<input type="number">` labelled "ID classe") | `ClassPicker` (local wrapper around `SearchSelect`) fed by `classesApi.fetchClasses`, label = class name, hint = code |

## New reusable component

`frontend-admin/src/components/ui/SearchSelect.tsx`

Generic searchable select. Props:

- `value: number | null`, `onChange(value: number | null)`
- `options: { value: number; label: string; hint?: string }[]`
- `isLoading`, `isError`, `disabled`
- `placeholder`, `emptyLabel`, `errorLabel`, `loadingLabel`

Behavior:

- Click to open, type to filter (substring match against `label` + `hint`).
- Renders loading / error / empty states.
- Selected item shows as `label — hint`. Includes an "Effacer la sélection"
  row when a value is set.
- Closes on outside click. Results capped at 50 rows to keep the dropdown
  responsive on large lists.

Callers are responsible for fetching options (via React Query) and mapping
their domain objects to `{ value, label, hint }`. This keeps the component
free of API coupling and reusable across modules.

## Not changed (intentionally)

- Admin-only CRUD pages where the user managing the entity legitimately
  needs to see/enter raw IDs (e.g. seeding screens) — none currently in the
  app, but flagged here so future contributors don't blanket-replace.
- API list filter inputs that already use `<select>` populated from the API
  (the existing pattern is fine; migrating them to `SearchSelect` is a
  follow-up polish, not a blocker).

## Verification

- `npx tsc --noEmit` passes.
- Manual smoke: open Notes → Saisie classe, confirm "Matière" dropdown
  loads subjects and submitting a bulk grade still posts `subject_id` as a
  number. Open Communications → Nouvelle annonce, set audience to "Une
  classe", confirm "Classe" dropdown loads classes and `class_id` is sent
  as a number.
