<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Enrollments\StoreEnrollmentRequest;
use App\Http\Requests\Api\V1\Enrollments\UpdateEnrollmentRequest;
use App\Http\Resources\EnrollmentResource;
use App\Http\Responses\ApiResponse;
use App\Models\Enrollment;
use App\Models\SchoolClass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Enrollment::query()->with(['schoolYear', 'schoolClass.level', 'student']);

        if ($request->filled('student_id')) {
            $query->where('student_id', (int) $request->input('student_id'));
        }
        if ($request->filled('school_year_id')) {
            $query->where('school_year_id', (int) $request->input('school_year_id'));
        }
        if ($request->filled('class_id')) {
            $query->where('class_id', (int) $request->input('class_id'));
        }

        $query->orderByDesc('enrollment_date');

        $perPage = min((int) $request->input('per_page', 25), 100);
        $paginator = $query->paginate($perPage)->withQueryString();

        return ApiResponse::success([
            'items' => EnrollmentResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Inscriptions.');
    }

    public function show(Enrollment $enrollment): JsonResponse
    {
        $enrollment->load(['schoolYear', 'schoolClass.level', 'student']);

        return ApiResponse::success(
            (new EnrollmentResource($enrollment))->resolve(),
            'Inscription.'
        );
    }

    public function store(StoreEnrollmentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $class = SchoolClass::query()->findOrFail($data['class_id']);

        if ((int) $class->school_year_id !== (int) $data['school_year_id']) {
            return ApiResponse::error(
                'La classe sélectionnée n’appartient pas à cette année scolaire.',
                [],
                422
            );
        }

        if ($this->hasConflictingActiveEnrollment((int) $data['student_id'], (int) $data['school_year_id'])) {
            return ApiResponse::error(
                'Une inscription encore active existe déjà pour cet élève sur cette année scolaire.',
                [],
                422
            );
        }

        $data['created_by'] = $request->user()?->id;

        $enrollment = Enrollment::query()->create($data);
        $enrollment->load(['schoolYear', 'schoolClass.level', 'student']);

        return ApiResponse::success(
            (new EnrollmentResource($enrollment))->resolve(),
            'Inscription créée.',
            201
        );
    }

    public function update(UpdateEnrollmentRequest $request, Enrollment $enrollment): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['class_id'])) {
            $class = SchoolClass::query()->findOrFail($data['class_id']);
            if ((int) $class->school_year_id !== (int) $enrollment->school_year_id) {
                return ApiResponse::error(
                    'La classe ne correspond pas à l’année de l’inscription.',
                    [],
                    422
                );
            }
        }

        $newStatus = $data['academic_status'] ?? $enrollment->academic_status;
        $studentId = (int) $enrollment->student_id;
        $schoolYearId = (int) $enrollment->school_year_id;

        if (Enrollment::academicStatusIsActive($newStatus)) {
            $conflict = Enrollment::query()
                ->where('student_id', $studentId)
                ->where('school_year_id', $schoolYearId)
                ->where('id', '!=', $enrollment->id)
                ->whereIn('academic_status', ['enrolled', 're_enrolled', 'transferred_in'])
                ->exists();

            if ($conflict) {
                return ApiResponse::error(
                    'Une autre inscription active existe pour cette année.',
                    [],
                    422
                );
            }
        }

        $data['updated_by'] = $request->user()?->id;

        $enrollment->fill($data);
        $enrollment->save();
        $enrollment->load(['schoolYear', 'schoolClass.level', 'student']);

        return ApiResponse::success(
            (new EnrollmentResource($enrollment->fresh()))->resolve(),
            'Inscription mise à jour.'
        );
    }

    public function nextNumber(): JsonResponse
    {
        $year = (int) date('Y');
        $prefix = 'INS-'.$year.'-';

        $last = Enrollment::query()
            ->where('enrollment_number', 'like', $prefix.'%')
            ->orderByDesc('enrollment_number')
            ->value('enrollment_number');

        $next = 1;
        if (is_string($last) && preg_match('/-(\d+)$/', $last, $m)) {
            $next = (int) $m[1] + 1;
        }

        return ApiResponse::success([
            'enrollment_number' => $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT),
        ], 'Prochain numéro d\'inscription.');
    }

    private function hasConflictingActiveEnrollment(int $studentId, int $schoolYearId): bool
    {
        return Enrollment::query()
            ->where('student_id', $studentId)
            ->where('school_year_id', $schoolYearId)
            ->whereIn('academic_status', ['enrolled', 're_enrolled', 'transferred_in'])
            ->exists();
    }
}
