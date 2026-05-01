<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Teachers\StoreTeacherAssignmentRequest;
use App\Http\Requests\Api\V1\Teachers\UpdateTeacherAssignmentRequest;
use App\Http\Resources\TeacherClassSubjectResource;
use App\Http\Responses\ApiResponse;
use App\Models\Teacher;
use App\Models\TeacherClassSubject;
use Illuminate\Http\JsonResponse;

class TeacherAssignmentController extends Controller
{
    public function index(Teacher $teacher): JsonResponse
    {
        $items = TeacherClassSubject::query()
            ->where('teacher_id', $teacher->id)
            ->with(['schoolClass.level', 'subject', 'schoolYear'])
            ->orderByDesc('school_year_id')
            ->orderBy('class_id')
            ->get();

        return ApiResponse::success(
            TeacherClassSubjectResource::collection($items)->resolve(),
            'Affectations.'
        );
    }

    public function store(StoreTeacherAssignmentRequest $request, Teacher $teacher): JsonResponse
    {
        $data = $request->validated();
        $data['teacher_id'] = $teacher->id;
        $assignment = TeacherClassSubject::query()->create($data);
        $assignment->load(['schoolClass.level', 'subject', 'schoolYear']);

        return ApiResponse::success(
            (new TeacherClassSubjectResource($assignment))->resolve(),
            'Affectation créée.',
            201
        );
    }

    public function update(UpdateTeacherAssignmentRequest $request, TeacherClassSubject $teacherClassSubject): JsonResponse
    {
        $teacherClassSubject->fill($request->validated());
        $teacherClassSubject->save();
        $teacherClassSubject->load(['schoolClass.level', 'subject', 'schoolYear']);

        return ApiResponse::success(
            (new TeacherClassSubjectResource($teacherClassSubject->fresh()))->resolve(),
            'Affectation mise à jour.'
        );
    }

    public function destroy(TeacherClassSubject $teacherClassSubject): JsonResponse
    {
        $teacherClassSubject->delete();

        return ApiResponse::success(null, 'Affectation supprimée.');
    }
}
