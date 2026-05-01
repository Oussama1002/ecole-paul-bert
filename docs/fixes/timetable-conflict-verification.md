# Timetable Conflict Verification

## Scope

This verification covers schedule conflict blocking for:

- same teacher at the same time
- same class at the same time
- same room at the same time
- both create (`POST /v1/schedule-entries`) and update (`PATCH /v1/schedule-entries/{id}`)

## Current Enforcement Path

Conflict checks are centralized in `ScheduleConflictService::detect()` and executed in both controller write paths:

- create path: `ScheduleEntryController::store()` calls `detect($candidate, null, $year)`
- update path: `ScheduleEntryController::update()` calls `detect($scheduleEntry, $scheduleEntry->id, $year)`

This ensures updates ignore the entry being edited while still blocking collisions with other entries.

## Conflict Rules

For entries in the same school year + day of week + overlapping effective date range + overlapping time range:

1. `teacher_busy`: same `teacher_id`
2. `class_busy`: same `class_id`
3. `room_busy`: same `room_id` (when room is set)

Time overlap uses `[start, end)` semantics (`intervalsOverlap`):

- adjacent slots (e.g. `09:00-10:00` and `10:00-11:00`) are allowed
- true intersections are blocked

## User-Friendly Errors

Conflict messages now include context and slot:

- `Conflit enseignant: ... (HH:MM-HH:MM).`
- `Conflit classe: ... (HH:MM-HH:MM).`
- `Conflit salle: ... (HH:MM-HH:MM).`

API response on conflict (422) includes:

- global message
- `errors.schedule[]` with user-facing messages
- structured `conflicts[]` (`code`, `message`, `conflicting_entry_id`)

Frontend (`ScheduleWeeklyPage`) now reads:

- `conflicts[]` for detailed conflict list
- `errors.schedule[0]` / `errors.end_time[0]` for direct form message fallback

## Verification Checklist

- [x] create endpoint blocks teacher collisions
- [x] create endpoint blocks class collisions
- [x] create endpoint blocks room collisions
- [x] update endpoint applies same conflict checks
- [x] update endpoint excludes current entry id from self-conflict
- [x] API returns readable conflict messages
- [x] frontend shows clear conflict errors

## Notes

- Conflict logic is intentionally server-side to prevent bypass via direct API calls.
- Frontend validation remains supportive; backend is source of truth.
