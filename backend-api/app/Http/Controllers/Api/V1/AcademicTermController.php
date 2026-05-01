<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AcademicTerms\IndexAcademicTermRequest;
use App\Http\Requests\Api\V1\AcademicTerms\StoreAcademicTermRequest;
use App\Http\Requests\Api\V1\AcademicTerms\UpdateAcademicTermRequest;
use App\Http\Resources\AcademicTermResource;
use App\Http\Responses\ApiResponse;
use App\Models\AcademicTerm;
use Illuminate\Http\JsonResponse;

class AcademicTermController extends Controller
{
    public function index(IndexAcademicTermRequest $request): JsonResponse
    {
        $query = AcademicTerm::query()->with('schoolYear');

        if ($sy = $request->validated('school_year_id')) {
            $query->where('school_year_id', $sy);
        }
        $validated = $request->validated();
        if (array_key_exists('is_active', $validated)) {
            $query->where('is_active', (bool) $validated['is_active']);
        }

        $query->orderBy($request->validated('sort_by'), $request->validated('sort_order'));

        $paginator = $query->paginate((int) $request->validated('per_page'))->withQueryString();

        return ApiResponse::success([
            'items' => AcademicTermResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Trimestres / semestres.');
    }

    public function show(AcademicTerm $academicTerm): JsonResponse
    {
        $academicTerm->load('schoolYear');

        return ApiResponse::success(
            (new AcademicTermResource($academicTerm))->resolve(),
            'Période académique.'
        );
    }

    public function store(StoreAcademicTermRequest $request): JsonResponse
    {
        $term = AcademicTerm::query()->create($request->validated());
        $term->load('schoolYear');

        return ApiResponse::success(
            (new AcademicTermResource($term))->resolve(),
            'Période créée.',
            201
        );
    }

    public function update(UpdateAcademicTermRequest $request, AcademicTerm $academicTerm): JsonResponse
    {
        $academicTerm->fill($request->validated());
        $academicTerm->save();
        $academicTerm->load('schoolYear');

        return ApiResponse::success(
            (new AcademicTermResource($academicTerm->fresh()))->resolve(),
            'Période mise à jour.'
        );
    }

    public function destroy(AcademicTerm $academicTerm): JsonResponse
    {
        if ($academicTerm->evaluationPeriods()->exists()) {
            return ApiResponse::error(
                'Impossible de supprimer : des périodes d’évaluation y sont rattachées.',
                [],
                422
            );
        }

        $academicTerm->delete();

        return ApiResponse::success(null, 'Période supprimée.');
    }
}
