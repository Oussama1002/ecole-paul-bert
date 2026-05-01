<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Guardians\AttachGuardianRequest;
use App\Http\Requests\Api\V1\Guardians\StoreGuardianRequest;
use App\Http\Requests\Api\V1\Guardians\UpdateGuardianRequest;
use App\Http\Resources\GuardianResource;
use App\Http\Resources\StudentResource;
use App\Http\Responses\ApiResponse;
use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GuardianController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Guardian::query();

        if ($search = $request->input('search')) {
            $s = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(first_name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(phone) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$s]);
            });
        }

        $perPage = min((int) $request->input('per_page', 25), 100);
        $paginator = $query->orderBy('last_name')->orderBy('first_name')->paginate($perPage)->withQueryString();

        return ApiResponse::success([
            'items' => GuardianResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Tuteurs.');
    }

    public function show(Guardian $guardian): JsonResponse
    {
        return ApiResponse::success(
            (new GuardianResource($guardian))->resolve(),
            'Tuteur.'
        );
    }

    public function store(StoreGuardianRequest $request): JsonResponse
    {
        $guardian = Guardian::query()->create($request->validated());

        return ApiResponse::success(
            (new GuardianResource($guardian))->resolve(),
            'Tuteur créé.',
            201
        );
    }

    public function update(UpdateGuardianRequest $request, Guardian $guardian): JsonResponse
    {
        $guardian->fill($request->validated());
        $guardian->save();

        return ApiResponse::success(
            (new GuardianResource($guardian->fresh()))->resolve(),
            'Tuteur mis à jour.'
        );
    }

    public function destroy(Guardian $guardian): JsonResponse
    {
        if ($guardian->students()->exists()) {
            return ApiResponse::error(
                'Impossible de supprimer : ce tuteur est lié à un ou plusieurs élèves.',
                [],
                422
            );
        }

        $guardian->delete();

        return ApiResponse::success(null, 'Tuteur supprimé.');
    }

    public function attach(AttachGuardianRequest $request, Student $student): JsonResponse
    {
        $data = $request->validated();
        $guardianId = $data['guardian_id'];

        if ($student->guardians()->where('guardians.id', $guardianId)->exists()) {
            return ApiResponse::error('Ce tuteur est déjà lié à cet élève.', [], 422);
        }

        $isPrimary = $request->boolean('is_primary_contact');

        DB::transaction(function () use ($student, $request, $guardianId, $isPrimary) {
            if ($isPrimary) {
                DB::table('student_guardians')
                    ->where('student_id', $student->id)
                    ->update(['is_primary_contact' => false]);
            }

            $student->guardians()->attach($guardianId, [
                'is_legal_guardian' => $request->boolean('is_legal_guardian'),
                'can_receive_notifications' => $request->boolean('can_receive_notifications', true),
                'can_pickup_student' => $request->boolean('can_pickup_student'),
                'is_primary_contact' => $isPrimary,
            ]);
        });

        $student->load('guardians');

        return ApiResponse::success(
            (new StudentResource($student))->resolve(),
            'Tuteur lié à l’élève.'
        );
    }

    public function updatePivot(Request $request, Student $student, Guardian $guardian): JsonResponse
    {
        $data = $request->validate([
            'is_legal_guardian' => ['sometimes', 'boolean'],
            'can_receive_notifications' => ['sometimes', 'boolean'],
            'can_pickup_student' => ['sometimes', 'boolean'],
            'is_primary_contact' => ['sometimes', 'boolean'],
        ]);

        if (! $student->guardians()->where('guardians.id', $guardian->id)->exists()) {
            return ApiResponse::error('Lien élève / tuteur introuvable.', [], 404);
        }

        DB::transaction(function () use ($student, $guardian, $request, $data) {
            if (array_key_exists('is_primary_contact', $data) && $request->boolean('is_primary_contact')) {
                DB::table('student_guardians')
                    ->where('student_id', $student->id)
                    ->update(['is_primary_contact' => false]);
            }

            $pivot = [];
            if (array_key_exists('is_legal_guardian', $data)) {
                $pivot['is_legal_guardian'] = $request->boolean('is_legal_guardian');
            }
            if (array_key_exists('can_receive_notifications', $data)) {
                $pivot['can_receive_notifications'] = $request->boolean('can_receive_notifications');
            }
            if (array_key_exists('can_pickup_student', $data)) {
                $pivot['can_pickup_student'] = $request->boolean('can_pickup_student');
            }
            if (array_key_exists('is_primary_contact', $data)) {
                $pivot['is_primary_contact'] = $request->boolean('is_primary_contact');
            }

            if ($pivot !== []) {
                $student->guardians()->updateExistingPivot($guardian->id, $pivot);
            }
        });

        $student->load('guardians');

        return ApiResponse::success(
            (new StudentResource($student))->resolve(),
            'Lien mis à jour.'
        );
    }

    public function detach(Student $student, Guardian $guardian): JsonResponse
    {
        if (! $student->guardians()->where('guardians.id', $guardian->id)->exists()) {
            return ApiResponse::error('Lien introuvable.', [], 404);
        }

        $student->guardians()->detach($guardian->id);

        return ApiResponse::success(null, 'Tuteur retiré.');
    }
}
