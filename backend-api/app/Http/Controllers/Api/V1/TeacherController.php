<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Teachers\IndexTeacherRequest;
use App\Http\Requests\Api\V1\Teachers\StoreTeacherRequest;
use App\Http\Requests\Api\V1\Teachers\UpdateTeacherRequest;
use App\Http\Resources\TeacherResource;
use App\Http\Responses\ApiResponse;
use App\Models\Teacher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Services\AuditLogger;

class TeacherController extends Controller
{
    public function __construct(
        private AuditLogger $audit
    ) {}

    public function index(IndexTeacherRequest $request): JsonResponse
    {
        $query = Teacher::query();

        if ($search = $request->validated('search')) {
            $s = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(employee_code) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(first_name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$s]);
            });
        }

        if ($status = $request->validated('status')) {
            $query->where('status', $status);
        }

        if ($employmentType = $request->validated('employment_type')) {
            $query->where('employment_type', $employmentType);
        }

        $query->orderBy($request->validated('sort_by'), $request->validated('sort_order'));

        $paginator = $query
            ->paginate((int) $request->validated('per_page'))
            ->withQueryString();

        return ApiResponse::success([
            'items' => TeacherResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Enseignants.');
    }

    public function show(Teacher $teacher): JsonResponse
    {
        $teacher->load(['user']);

        return ApiResponse::success(
            (new TeacherResource($teacher))->resolve(),
            'Enseignant.'
        );
    }

    public function store(StoreTeacherRequest $request): JsonResponse
    {
        $teacher = Teacher::query()->create($request->validated());
        $this->audit->log(
            $request->user(),
            'teacher.created',
            $teacher,
            null,
            $teacher->only(['employee_code', 'first_name', 'last_name', 'email', 'status', 'employment_type'])
        );

        return ApiResponse::success(
            (new TeacherResource($teacher->fresh(['user'])))->resolve(),
            'Enseignant créé.',
            201
        );
    }

    public function update(UpdateTeacherRequest $request, Teacher $teacher): JsonResponse
    {
        $before = $teacher->only(['employee_code', 'first_name', 'last_name', 'email', 'status', 'employment_type']);
        $teacher->fill($request->validated());
        $teacher->save();
        $changes = $teacher->getChanges();
        if ($changes !== []) {
            $this->audit->log(
                $request->user(),
                'teacher.updated',
                $teacher,
                array_intersect_key($before, array_flip(array_keys($changes))),
                $changes
            );
            if (array_key_exists('status', $changes) && in_array((string) $changes['status'], ['inactive', 'suspended', 'left'], true)) {
                $this->audit->log(
                    $request->user(),
                    'teacher.archived',
                    $teacher,
                    ['status' => $before['status'] ?? null],
                    ['status' => $changes['status']]
                );
            }
        }

        return ApiResponse::success(
            (new TeacherResource($teacher->fresh(['user'])))->resolve(),
            'Enseignant mis à jour.'
        );
    }

    public function destroy(Request $request, Teacher $teacher): JsonResponse
    {
        $before = $teacher->only(['employee_code', 'first_name', 'last_name', 'email', 'status', 'employment_type']);
        $teacher->delete();
        $this->audit->log(
            $request->user(),
            'teacher.deleted',
            $teacher,
            $before,
            ['deleted' => true]
        );

        return ApiResponse::success(null, 'Enseignant supprimé.');
    }
}
