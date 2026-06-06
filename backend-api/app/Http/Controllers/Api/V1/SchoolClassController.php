<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Classes\IndexSchoolClassRequest;
use App\Http\Requests\Api\V1\Classes\StoreSchoolClassRequest;
use App\Http\Requests\Api\V1\Classes\UpdateSchoolClassRequest;
use App\Http\Resources\SchoolClassResource;
use App\Http\Responses\ApiResponse;
use App\Models\SchoolClass;
use App\Services\ClassSchoolYearService;
use App\Services\TeacherScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class SchoolClassController extends Controller
{
    public function __construct(
        private TeacherScopeService $teacherScope,
        private ClassSchoolYearService $classSchoolYears,
    ) {}

    public function index(IndexSchoolClassRequest $request): JsonResponse
    {
        $query = SchoolClass::query()->with(['level', 'schoolYear', 'schoolYears']);

        $this->scopeToTeacherClassesIfStrict($request, $query);

        if ($search = $request->validated('search')) {
            $s = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(code) LIKE ?', [$s]);
            });
        }
        if ($sy = $request->validated('school_year_id')) {
            $query->forSchoolYear((int) $sy);
        }
        if ($lid = $request->validated('level_id')) {
            $query->where('level_id', $lid);
        }
        if ($status = $request->validated('status')) {
            $query->where('status', $status);
        }

        $query->orderBy($request->validated('sort_by'), $request->validated('sort_order'));

        $paginator = $query->paginate((int) $request->validated('per_page'))->withQueryString();

        return ApiResponse::success([
            'items' => SchoolClassResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Classes.');
    }

    public function show(\Illuminate\Http\Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $this->ensureTeacherTeachesClassIfStrict($request, $schoolClass);

        $schoolClass->load(['level', 'schoolYear', 'schoolYears', 'mainTeacher']);

        return ApiResponse::success(
            (new SchoolClassResource($schoolClass))->resolve(),
            'Classe.'
        );
    }

    public function store(StoreSchoolClassRequest $request): JsonResponse
    {
        $data = $request->validated();
        $schoolYearIds = $data['school_year_ids'] ?? null;
        unset($data['school_year_ids']);
        $data['school_year_id'] = null;

        $class = SchoolClass::query()->create($data);
        $this->classSchoolYears->syncSchoolYears($class, $schoolYearIds);
        $class->load(['level', 'schoolYear', 'schoolYears', 'mainTeacher']);

        return ApiResponse::success(
            (new SchoolClassResource($class))->resolve(),
            'Classe créée.',
            201
        );
    }

    public function update(UpdateSchoolClassRequest $request, SchoolClass $schoolClass): JsonResponse
    {
        $data = $request->validated();
        $schoolYearIds = array_key_exists('school_year_ids', $data)
            ? $data['school_year_ids']
            : null;
        unset($data['school_year_ids']);

        $schoolClass->fill($data);
        $schoolClass->save();

        if ($schoolYearIds !== null) {
            $this->classSchoolYears->syncSchoolYears($schoolClass, $schoolYearIds);
        }

        $schoolClass->load(['level', 'schoolYear', 'schoolYears', 'mainTeacher']);

        return ApiResponse::success(
            (new SchoolClassResource($schoolClass->fresh()))->resolve(),
            'Classe mise à jour.'
        );
    }

    public function destroy(SchoolClass $schoolClass): JsonResponse
    {
        $schoolClass->delete();

        return ApiResponse::success(null, 'Classe supprimée.');
    }

    private function scopeToTeacherClassesIfStrict(\Illuminate\Http\Request $request, $query): void
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
        $query->whereExists(function ($sub) use ($tid) {
            $sub->selectRaw('1')
                ->from('teacher_class_subjects as tcs')
                ->whereColumn('tcs.class_id', 'classes.id')
                ->where(function ($yearQ) {
                    $yearQ->whereColumn('tcs.school_year_id', 'classes.school_year_id')
                        ->orWhereExists(function ($pivot) {
                            $pivot->selectRaw('1')
                                ->from('class_school_year as csy')
                                ->whereColumn('csy.class_id', 'classes.id')
                                ->whereColumn('csy.school_year_id', 'tcs.school_year_id');
                        });
                })
                ->where('tcs.teacher_id', $tid)
                ->where(function ($q) {
                    $q->whereNull('tcs.status')->orWhere('tcs.status', 'active');
                });
        });
    }

    private function ensureTeacherTeachesClassIfStrict(\Illuminate\Http\Request $request, SchoolClass $class): void
    {
        $user = $request->user();
        if (! $this->teacherScope->isStrictTeacher($user)) {
            return;
        }
        $tid = $this->teacherScope->resolveTeacherId($user);
        if ($tid === null) {
            throw new AccessDeniedHttpException('Accès refusé à cette classe.');
        }
        $teaches = \App\Models\TeacherClassSubject::query()
            ->where('teacher_id', $tid)
            ->where('class_id', $class->id)
            ->where(function ($q) use ($class) {
                if ($class->school_year_id !== null) {
                    $q->where('school_year_id', $class->school_year_id);
                } else {
                    $q->whereIn(
                        'school_year_id',
                        $class->schoolYears()->pluck('school_years.id')
                    );
                }
            })
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', 'active');
            })
            ->exists();
        if (! $teaches) {
            throw new AccessDeniedHttpException('Accès refusé à cette classe.');
        }
    }
}
