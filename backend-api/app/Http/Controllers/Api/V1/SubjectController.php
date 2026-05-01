<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Subjects\IndexSubjectRequest;
use App\Http\Requests\Api\V1\Subjects\StoreSubjectRequest;
use App\Http\Requests\Api\V1\Subjects\UpdateSubjectRequest;
use App\Http\Resources\SubjectResource;
use App\Http\Responses\ApiResponse;
use App\Models\Subject;
use App\Services\TeacherScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SubjectController extends Controller
{
    public function __construct(private TeacherScopeService $teacherScope) {}

    public function index(IndexSubjectRequest $request): JsonResponse
    {
        $query = Subject::query()->with('level');

        $user = $request->user();
        if ($this->teacherScope->isStrictTeacher($user)) {
            $tid = $this->teacherScope->resolveTeacherId($user);
            if ($tid === null) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereExists(function ($sub) use ($tid) {
                    $sub->selectRaw('1')
                        ->from('teacher_class_subjects as tcs')
                        ->whereColumn('tcs.subject_id', 'subjects.id')
                        ->where('tcs.teacher_id', $tid)
                        ->where(function ($q) {
                            $q->whereNull('tcs.status')->orWhere('tcs.status', 'active');
                        });
                });
            }
        }

        if ($search = $request->validated('search')) {
            $s = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(code) LIKE ?', [$s]);
            });
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
            'items' => SubjectResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Matières.');
    }

    public function show(Subject $subject): JsonResponse
    {
        $subject->load('level');

        return ApiResponse::success(
            (new SubjectResource($subject))->resolve(),
            'Matière.'
        );
    }

    public function store(StoreSubjectRequest $request): JsonResponse
    {
        $subject = Subject::query()->create($request->validated());
        $subject->load('level');

        return ApiResponse::success(
            (new SubjectResource($subject))->resolve(),
            'Matière créée.',
            201
        );
    }

    public function update(UpdateSubjectRequest $request, Subject $subject): JsonResponse
    {
        $subject->fill($request->validated());
        $subject->save();
        $subject->load('level');

        return ApiResponse::success(
            (new SubjectResource($subject->fresh()))->resolve(),
            'Matière mise à jour.'
        );
    }

    public function destroy(Subject $subject): JsonResponse
    {
        $subject->delete();

        return ApiResponse::success(null, 'Matière supprimée.');
    }
}
