<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Teachers\StoreTeacherObservationRequest;
use App\Http\Resources\TeacherObservationResource;
use App\Http\Responses\ApiResponse;
use App\Models\Teacher;
use App\Models\TeacherObservation;
use App\Services\TeacherScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Teacher observations journal — chronological remarks/complaints attached to
 * a teacher profile. Read-only unless the user has `teachers.manage`.
 */
class TeacherObservationController extends Controller
{
    public function __construct(private TeacherScopeService $scope) {}

    public function index(Request $request, Teacher $teacher): JsonResponse
    {
        $user = $request->user();
        if ($user && $this->scope->isStrictTeacher($user)) {
            $ownTeacherId = $this->scope->resolveTeacherId($user);
            if ($ownTeacherId === null || $ownTeacherId !== $teacher->id) {
                return ApiResponse::error('Accès non autorisé.', [], 403);
            }
        }

        $items = TeacherObservation::query()
            ->with('author')
            ->where('teacher_id', $teacher->id)
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success(
            TeacherObservationResource::collection($items)->resolve(),
            'Observations enseignant.'
        );
    }

    public function store(StoreTeacherObservationRequest $request, Teacher $teacher): JsonResponse
    {
        $data = $request->validated();

        $obs = TeacherObservation::create([
            'teacher_id' => $teacher->id,
            'type' => $data['type'],
            'comment' => $data['comment'],
            'created_by' => $request->user()?->id,
        ]);

        $obs->load('author');

        return ApiResponse::success(
            (new TeacherObservationResource($obs))->resolve(),
            'Observation ajoutée.'
        );
    }

    public function destroy(Teacher $teacher, TeacherObservation $observation): JsonResponse
    {
        if ((int) $observation->teacher_id !== (int) $teacher->id) {
            return ApiResponse::error('Observation introuvable pour cet enseignant.', [], 404);
        }

        $observation->delete();

        return ApiResponse::success(null, 'Observation supprimée.');
    }
}
