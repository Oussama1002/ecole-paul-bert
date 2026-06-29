<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Schedule\IndexScheduleEntryRequest;
use App\Http\Requests\Api\V1\Schedule\StoreScheduleEntryRequest;
use App\Http\Requests\Api\V1\Schedule\UpdateScheduleEntryRequest;
use App\Http\Requests\Api\V1\Schedule\WeeklyScheduleRequest;
use App\Http\Resources\ScheduleEntryResource;
use App\Http\Responses\ApiResponse;
use App\Models\Room;
use App\Models\ScheduleEntry;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Teacher;
use App\Services\ScheduleConflictService;
use App\Services\TeacherScopeService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class ScheduleEntryController extends Controller
{
    public function __construct(
        private ScheduleConflictService $conflictService,
        private TeacherScopeService $teacherScope
    ) {}

    private function scopeToOwnTeacherIfStrict(Request $request, $query): void
    {
        $user = $request->user();
        if (! $this->teacherScope->isStrictTeacher($user)) {
            return;
        }
        $tid = $this->teacherScope->resolveTeacherId($user);
        if ($tid === null) {
            $query->whereRaw('1 = 0');

            return;
        }
        $query->where('teacher_id', $tid);
    }

    private function ensureOwnTeacherIfStrict(Request $request, ScheduleEntry $entry): void
    {
        $user = $request->user();
        if (! $this->teacherScope->isStrictTeacher($user)) {
            return;
        }
        $tid = $this->teacherScope->resolveTeacherId($user);
        if ($tid === null || (int) $entry->teacher_id !== $tid) {
            throw new AccessDeniedHttpException('Vous ne pouvez consulter que votre propre emploi du temps.');
        }
    }

    public function index(IndexScheduleEntryRequest $request): JsonResponse
    {
        $query = ScheduleEntry::query()
            ->with(['schoolClass', 'subject', 'room', 'teacher', 'schoolYear', 'academicTerm']);

        if ($sy = $request->validated('school_year_id')) {
            $query->where('school_year_id', $sy);
        }
        if ($cid = $request->validated('class_id')) {
            $query->where('class_id', $cid);
        }
        if ($tid = $request->validated('teacher_id')) {
            $query->where('teacher_id', $tid);
        }
        if ($rid = $request->validated('room_id')) {
            $query->where('room_id', $rid);
        }
        if ($dow = $request->validated('day_of_week')) {
            $query->where('day_of_week', $dow);
        }
        if ($st = $request->validated('status')) {
            $query->where('status', $st);
        }

        $this->scopeToOwnTeacherIfStrict($request, $query);

        $sortBy = $request->validated('sort_by');
        $order = $request->validated('sort_order');
        if ($sortBy === 'day_of_week') {
            $query->orderByRaw("FIELD(day_of_week, 'monday','tuesday','wednesday','thursday','friday','saturday','sunday')");
            $query->orderBy('start_time', $order);
        } else {
            $query->orderBy($sortBy, $order);
        }

        $paginator = $query
            ->paginate((int) $request->validated('per_page'))
            ->withQueryString();

        return ApiResponse::success([
            'items' => ScheduleEntryResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Créneaux.');
    }

    public function show(Request $request, ScheduleEntry $scheduleEntry): JsonResponse
    {
        $this->ensureOwnTeacherIfStrict($request, $scheduleEntry);

        $scheduleEntry->load(['schoolClass', 'subject', 'room', 'teacher', 'schoolYear', 'academicTerm']);

        return ApiResponse::success(
            (new ScheduleEntryResource($scheduleEntry))->resolve(),
            'Créneau.'
        );
    }

    public function store(StoreScheduleEntryRequest $request): JsonResponse
    {
        $year = SchoolYear::query()->findOrFail((int) $request->validated('school_year_id'));
        $data = $request->validated();
        $data['created_by'] = $request->user()?->id;

        $candidate = new ScheduleEntry($data);
        $conflicts = $this->conflictService->detect($candidate, null, $year);
        if ($conflicts !== []) {
            return $this->conflictResponse($conflicts);
        }

        $entry = ScheduleEntry::query()->create($data);
        $entry->load(['schoolClass', 'subject', 'room', 'teacher', 'schoolYear', 'academicTerm']);

        return ApiResponse::success(
            (new ScheduleEntryResource($entry))->resolve(),
            'Créneau créé.',
            201
        );
    }

    public function update(UpdateScheduleEntryRequest $request, ScheduleEntry $scheduleEntry): JsonResponse
    {
        $year = SchoolYear::query()->findOrFail(
            (int) ($request->input('school_year_id') ?? $scheduleEntry->school_year_id)
        );

        $scheduleEntry->fill($request->validated());
        $conflicts = $this->conflictService->detect($scheduleEntry, $scheduleEntry->id, $year);
        if ($conflicts !== []) {
            return $this->conflictResponse($conflicts);
        }

        $scheduleEntry->updated_by = $request->user()?->id;
        $scheduleEntry->save();
        $scheduleEntry->load(['schoolClass', 'subject', 'room', 'teacher', 'schoolYear', 'academicTerm']);

        return ApiResponse::success(
            (new ScheduleEntryResource($scheduleEntry->fresh()))->resolve(),
            'Créneau mis à jour.'
        );
    }

    public function destroy(ScheduleEntry $scheduleEntry): JsonResponse
    {
        $scheduleEntry->delete();

        return ApiResponse::success(null, 'Créneau supprimé.');
    }

    public function weekly(WeeklyScheduleRequest $request): JsonResponse
    {
        $year = SchoolYear::query()->findOrFail((int) $request->validated('school_year_id'));
        $weekStart = Carbon::parse($request->validated('week_start'))->startOfWeek(Carbon::MONDAY);
        $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SUNDAY);

        $query = ScheduleEntry::query()
            ->where('school_year_id', $year->id)
            ->with(['schoolClass', 'subject', 'room', 'teacher']);

        if ($cid = $request->validated('class_id')) {
            $query->where('class_id', $cid);
        }
        if ($tid = $request->validated('teacher_id')) {
            $query->where('teacher_id', $tid);
        }
        if ($rid = $request->validated('room_id')) {
            $query->where('room_id', $rid);
        }

        $status = $request->validated('status');
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $this->scopeToOwnTeacherIfStrict($request, $query);

        $entries = $query->get();

        $phpWeekdayToEnum = [
            0 => 'sunday',
            1 => 'monday',
            2 => 'tuesday',
            3 => 'wednesday',
            4 => 'thursday',
            5 => 'friday',
            6 => 'saturday',
        ];

        $days = [];
        for ($i = 0; $i < 7; $i++) {
            $day = $weekStart->copy()->addDays($i);
            $dow = $phpWeekdayToEnum[(int) $day->format('w')];
            $days[$dow] = [];
            foreach ($entries as $entry) {
                if ($entry->day_of_week !== $dow) {
                    continue;
                }
                if (! $this->entryAppliesOnDate($entry, $day->toDateString(), $year)) {
                    continue;
                }
                $days[$dow][] = (new ScheduleEntryResource($entry))->resolve();
            }
        }

        return ApiResponse::success([
            'week_start' => $weekStart->toDateString(),
            'week_end' => $weekEnd->toDateString(),
            'school_year' => [
                'id' => $year->id,
                'name' => $year->name,
            ],
            'days' => $days,
        ], 'Planning hebdomadaire.');
    }

    public function forClass(SchoolClass $schoolClass, Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
        ]);

        $query = ScheduleEntry::query()
            ->where('class_id', $schoolClass->id)
            ->with(['schoolClass', 'subject', 'room', 'teacher', 'schoolYear']);

        if ($sy = $request->query('school_year_id')) {
            $query->where('school_year_id', (int) $sy);
        }

        $this->scopeToOwnTeacherIfStrict($request, $query);

        $items = $query
            ->orderByRaw("FIELD(day_of_week, 'monday','tuesday','wednesday','thursday','friday','saturday','sunday')")
            ->orderBy('start_time')
            ->get();

        return ApiResponse::success(
            ScheduleEntryResource::collection($items)->resolve(),
            'Emploi du temps (classe).'
        );
    }

    public function forRoom(Room $room, Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
        ]);

        $query = ScheduleEntry::query()
            ->where('room_id', $room->id)
            ->with(['schoolClass', 'subject', 'room', 'teacher', 'schoolYear']);

        if ($sy = $request->query('school_year_id')) {
            $query->where('school_year_id', (int) $sy);
        }

        $this->scopeToOwnTeacherIfStrict($request, $query);

        $items = $query
            ->orderByRaw("FIELD(day_of_week, 'monday','tuesday','wednesday','thursday','friday','saturday','sunday')")
            ->orderBy('start_time')
            ->get();

        return ApiResponse::success(
            ScheduleEntryResource::collection($items)->resolve(),
            'Emploi du temps (salle).'
        );
    }

    public function forTeacher(Request $request, Teacher $teacher): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
        ]);

        if ($this->teacherScope->isStrictTeacher($request->user())) {
            $tid = $this->teacherScope->resolveTeacherId($request->user());
            if ($tid === null || (int) $teacher->id !== $tid) {
                throw new AccessDeniedHttpException('Vous ne pouvez consulter que votre propre emploi du temps.');
            }
        }

        $query = ScheduleEntry::query()
            ->where('teacher_id', $teacher->id)
            ->with(['schoolClass', 'subject', 'room', 'teacher', 'schoolYear']);

        if ($sy = $request->query('school_year_id')) {
            $query->where('school_year_id', (int) $sy);
        }

        $items = $query
            ->orderByRaw("FIELD(day_of_week, 'monday','tuesday','wednesday','thursday','friday','saturday','sunday')")
            ->orderBy('start_time')
            ->get();

        return ApiResponse::success(
            ScheduleEntryResource::collection($items)->resolve(),
            'Emploi du temps (enseignant).'
        );
    }

    private function entryAppliesOnDate(ScheduleEntry $entry, string $dateStr, SchoolYear $year): bool
    {
        // Recurring weekly créneaux without an explicit validity window are shown on every
        // matching weekday in the grid (emploi du temps template), even when the viewed
        // calendar week falls before/after the school year's official dates.
        if ($entry->effective_start_date === null && $entry->effective_end_date === null) {
            return true;
        }

        $d = Carbon::parse($dateStr)->startOfDay();
        $start = $entry->effective_start_date ?? $year->start_date;
        $end = $entry->effective_end_date ?? $year->end_date;
        if (! $start || ! $end) {
            return true;
        }

        return $d->gte($start->copy()->startOfDay()) && $d->lte($end->copy()->endOfDay());
    }

    /**
     * @param  list<array{code: string, message: string, conflicting_entry_id: int}>  $conflicts
     */
    private function conflictResponse(array $conflicts): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Créneau refusé: enseignant, classe ou salle déjà occupé(e) sur cette plage horaire.',
            'errors' => [
                'schedule' => array_map(
                    static fn (array $c) => $c['message'],
                    $conflicts
                ),
            ],
            'conflicts' => $conflicts,
        ], 422);
    }
}
