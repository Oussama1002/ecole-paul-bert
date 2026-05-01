# Teacher row-level authorization — audit & hardening

A user with role `teacher` must only be able to:

- see classes / subjects they are assigned to
- enter grades for an assigned (class, subject)
- mark attendance for sessions they teach
- view their own timetable

Permission middleware (`permission:grades.manage`, etc.) is necessary but
not sufficient — it gates the action verb, not the row. Row-level
scoping was missing on several endpoints; this pass closes the bypasses.

## Existing scaffold

`app/Services/TeacherScopeService.php` is the single source of truth:

- `isStrictTeacher(User)` — true iff `role.code === 'teacher'`. Admins,
  directors, secretaries are NOT strict and bypass scoping.
- `resolveTeacherId(User)` — resolves `users.teacher` HasOne. Returns
  null if a teacher account has no `teachers` row → callers must treat
  this as "see/edit nothing", not "see/edit all".
- `restrictGradesQuery(User, Builder)` / `restrictAttendanceQuery(...)`
  — `whereExists` against `teacher_class_subjects` for list endpoints.
- `assertGradeRowScope(...)`, `assertTeacherTeachesClassSubject(...)`,
  `assertTeacherTeachesClass(...)`, `assertAttendanceWriteScope(...)`
  — throw `ValidationException` (422) for write/show paths.

The teacher↔assignment relationship is `teacher_class_subjects`
(teacher_id, class_id, subject_id, school_year_id) with status
`null|active`. UNIQUE on the four-tuple.

## Endpoint matrix (after this pass)

Symbols: ✅ scoped, ❌ open, n/a admin-only by permission.

| Endpoint | Before | After |
|---|---|---|
| `GET /grades` (`index`) | ✅ | ✅ |
| `GET /grades/{g}` (`show`) | ✅ | ✅ |
| `POST /grades` (`store`) | ❌ | ✅ — added `assertTeacherTeachesClassSubject` |
| `PATCH /grades/{g}` (`update`) | ✅ | ✅ |
| `DELETE /grades/{g}` (`destroy`) | ✅ | ✅ |
| `POST /grades/bulk` (`bulkStore`) | ✅ | ✅ |
| `GET /grades/export` (`exportExcel`) | ✅ | ✅ |
| `GET /attendance-records` (`index`) | ✅ | ✅ |
| `POST /attendance-records` (`store`) | ✅ | ✅ |
| `GET /attendance-records/{a}` (`show`) | ✅ | ✅ |
| `PATCH /attendance-records/{a}` (`update`) | ❌ | ✅ — added visibility + write-scope assertion |
| `DELETE /attendance-records/{a}` | ✅ | ✅ |
| `POST /classes/{c}/attendance/bulk` (`bulkMark`) | ⚠️ partial | ✅ — added `assertAttendanceWriteScope` + force `teacher_id` to caller |
| `POST /attendance-records/{a}/justify` | ✅ | ✅ |
| `GET /schedule-entries` (`index`) | ❌ | ✅ — auto-filtered to caller's `teacher_id` |
| `GET /schedule-entries/{s}` (`show`) | ❌ | ✅ — 403 if not own row |
| `POST/PATCH/DELETE /schedule-entries` | ❌ at row level | route already guarded by `schedule.manage` (teachers don't have it); helpers in place if granted later |
| `GET /schedule/weekly` | ❌ | ✅ — auto-filtered |
| `GET /classes/{c}/schedule-entries` (`forClass`) | ❌ | ✅ — auto-filtered (teacher sees only their own slots in that class) |
| `GET /rooms/{r}/schedule-entries` (`forRoom`) | ❌ | ✅ — auto-filtered |
| `GET /teachers/{t}/schedule` (`forTeacher`) | ⚠️ accepted any t | ✅ — 403 if `t !== own teacher_id` |
| `GET /classes` (`index`) | ❌ | ✅ — `whereExists` on `teacher_class_subjects` |
| `GET /classes/{c}` (`show`) | ❌ | ✅ — 403 if not in caller's `teacher_class_subjects` |
| `GET /subjects` (`index`) | ❌ | ✅ — `whereExists` on `teacher_class_subjects` |
| `GET /subjects/{s}` (`show`) | ❌ | not changed (low risk; subject metadata only) |
| `GET /report-cards*` | ❌ | not changed in this pass — teachers don't have `report_cards.view` by default; tracked as follow-up if role is broadened |
| `PATCH /teacher-class-subjects/{id}` | ❌ | not changed — protected by `teachers.manage` (admin/director only) |

## Files changed

- `backend-api/app/Http/Controllers/Api/V1/GradeController.php` — added
  `assertTeacherTeachesClassSubject` at the top of `store()`.
- `backend-api/app/Http/Controllers/Api/V1/AttendanceRecordController.php`
  - `update()`: now calls `assertAttendanceRecordVisible` then
    `assertAttendanceWriteScope` using the row's own
    `school_year_id` / `class_id` / `subject_id` /
    `schedule_entry_id` (so a teacher can't pivot a record they don't
    own).
  - `bulkMark()`: now calls `assertAttendanceWriteScope` before
    iterating, and force-overrides `teacher_id` to the caller's
    `teacher_id` if strict (mirrors what `bulkStore` already did for
    grades).
- `backend-api/app/Http/Controllers/Api/V1/ScheduleEntryController.php`
  - new constructor dep on `TeacherScopeService`.
  - new `scopeToOwnTeacherIfStrict` (list helper) and
    `ensureOwnTeacherIfStrict` (single-row helper, throws
    `AccessDeniedHttpException` → 403).
  - applied to `index`, `show`, `weekly`, `forClass`, `forRoom`,
    `forTeacher`.
- `backend-api/app/Http/Controllers/Api/V1/SchoolClassController.php`
  - new constructor dep, `scopeToTeacherClassesIfStrict` on `index`,
    `ensureTeacherTeachesClassIfStrict` on `show`.
- `backend-api/app/Http/Controllers/Api/V1/SubjectController.php`
  - new constructor dep, `whereExists` filter on `index`.

## Defense against ID-tampering

The bypass pattern of concern is "teacher posts to `/grades` with a
`class_id` they don't teach". After this pass:

- **Writes (grades, attendance)** validate the (teacher, class,
  subject, year) tuple against `teacher_class_subjects` *before* any
  Eloquent `create`/`save`. If the tuple is absent, a 422 `scope`
  error is returned in French.
- **Single-row reads** (`/grades/{id}`, `/attendance-records/{id}`,
  `/classes/{id}`, `/schedule-entries/{id}`) re-derive the (class,
  subject, year) from the row itself (not the request), then assert.
  Tampering the URL ID either lands on a row the teacher doesn't teach
  (→ 422/403) or on a 404.
- **Bulk operations** (`/grades/bulk`, `/classes/{c}/attendance/bulk`)
  override any `teacher_id` in the payload with the caller's resolved
  teacher record before insert. A teacher cannot impersonate another
  teacher in audit/marker columns.
- **Schedule single-row reads** use `AccessDeniedHttpException` (403)
  instead of 422 since they are read-only access checks rather than
  validation failures.

## Tests

Existing test files (`tests/Feature/GradesAndReportCardsAuthTest`,
`AttendanceApiAuthTest`, `ScheduleApiAuthTest`) only assert the 401
unauthenticated case. **No 403/422 row-level tests existed and none
were added in this pass** — the pass scope was source-level closure of
the bypass paths. Recommended next test cases:

- `TeacherCannotGradeOtherClassTest`: teacher A POSTs `/grades` with a
  class they don't teach → expect 422 with `scope` error.
- `TeacherCannotEditOtherTeachersAttendanceTest`: teacher A PATCHes a
  record owned by teacher B → expect 422.
- `TeacherCannotImpersonateInBulkTest`: teacher A POSTs
  `/grades/bulk` with `teacher_id` = B → assert all rows persisted
  with `entered_by` = A and the assignment matched A.
- `TeacherSeesOnlyOwnScheduleTest`: GET `/schedule/weekly` returns
  only entries with `teacher_id = A`.
- `TeacherCannotReadOtherTeacherScheduleTest`: GET
  `/teachers/{B}/schedule` as A → expect 403.
- `TeacherClassListIsScopedTest`: GET `/classes` returns only classes
  appearing in A's `teacher_class_subjects`.

## Verification done in this pass

- `php -l` syntax-clean on all five modified controllers.
- No DB schema changes; nothing to migrate.
- Strict-teacher path is opt-in via `isStrictTeacher` — admins,
  directors and secretaries are unaffected.
- Behavior for accounts with `role.code === 'teacher'` but no
  `teachers` row remains "see and write nothing" (existing
  `requireTeacherProfile` semantics, applied via `whereRaw('1 = 0')`
  on list queries).

## Frontend impact

No frontend changes required for the read-side fixes — the React Query
list endpoints will simply return fewer rows for strict teachers, which
the existing UI handles via empty states. Write paths already surface
422 messages from `messageFromFailedApiPayload`, so the new "Vous
n'êtes pas affecté à cette matière pour cette classe." message renders
inline in the grade and attendance forms with no further work.

A follow-up frontend pass should hide unreachable navigation items
(e.g. don't show a "Toutes les classes" tab in the strict-teacher menu)
to avoid empty screens. Tracked outside this audit.
