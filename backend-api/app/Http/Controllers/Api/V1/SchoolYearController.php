<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SchoolYears\IndexSchoolYearRequest;
use App\Http\Requests\Api\V1\SchoolYears\StoreSchoolYearRequest;
use App\Http\Requests\Api\V1\SchoolYears\UpdateSchoolYearRequest;
use App\Http\Resources\SchoolYearResource;
use App\Http\Responses\ApiResponse;
use App\Models\SchoolYear;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SchoolYearController extends Controller
{
    public function index(IndexSchoolYearRequest $request): JsonResponse
    {
        $query = SchoolYear::query();

        if ($search = $request->validated('search')) {
            $s = '%'.Str::lower($search).'%';
            $query->whereRaw('LOWER(name) LIKE ?', [$s]);
        }
        if ($status = $request->validated('status')) {
            $query->where('status', $status);
        }
        $validated = $request->validated();
        if (array_key_exists('is_current', $validated)) {
            $query->where('is_current', (bool) $validated['is_current']);
        }

        $query->orderBy($request->validated('sort_by'), $request->validated('sort_order'));

        $paginator = $query->paginate((int) $request->validated('per_page'))->withQueryString();

        return ApiResponse::success([
            'items' => SchoolYearResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Années scolaires.');
    }

    public function show(SchoolYear $schoolYear): JsonResponse
    {
        return ApiResponse::success(
            (new SchoolYearResource($schoolYear))->resolve(),
            'Année scolaire.'
        );
    }

    public function store(StoreSchoolYearRequest $request): JsonResponse
    {
        $data = $request->validated();
        $setCurrent = (bool) ($data['is_current'] ?? false);
        unset($data['is_current']);

        $year = DB::transaction(function () use ($data, $setCurrent) {
            if ($setCurrent) {
                SchoolYear::query()->update(['is_current' => false]);
            }

            return SchoolYear::query()->create(array_merge($data, [
                'is_current' => $setCurrent,
            ]));
        });

        return ApiResponse::success(
            (new SchoolYearResource($year))->resolve(),
            'Année scolaire créée.',
            201
        );
    }

    public function update(UpdateSchoolYearRequest $request, SchoolYear $schoolYear): JsonResponse
    {
        $data = $request->validated();
        $setCurrent = array_key_exists('is_current', $data) ? (bool) $data['is_current'] : null;
        if ($setCurrent !== null) {
            unset($data['is_current']);
        }

        DB::transaction(function () use ($schoolYear, $data, $setCurrent) {
            if ($setCurrent === true) {
                SchoolYear::query()->update(['is_current' => false]);
                $schoolYear->fill($data);
                $schoolYear->is_current = true;
                if ($schoolYear->status === 'planned') {
                    $schoolYear->status = 'active';
                }
                $schoolYear->save();
            } elseif ($setCurrent === false) {
                $schoolYear->fill($data);
                $schoolYear->is_current = false;
                $schoolYear->save();
            } else {
                $schoolYear->fill($data);
                $schoolYear->save();
            }
        });

        return ApiResponse::success(
            (new SchoolYearResource($schoolYear->fresh()))->resolve(),
            'Année scolaire mise à jour.'
        );
    }

    public function destroy(SchoolYear $schoolYear): JsonResponse
    {
        if ($schoolYear->classes()->exists()) {
            return ApiResponse::error(
                'Impossible de supprimer : des classes sont rattachées à cette année.',
                [],
                422
            );
        }
        if ($schoolYear->academicTerms()->exists() || $schoolYear->evaluationPeriods()->exists()) {
            return ApiResponse::error(
                'Impossible de supprimer : des périodes ou trimestres existent pour cette année.',
                [],
                422
            );
        }

        $schoolYear->delete();

        return ApiResponse::success(null, 'Année scolaire supprimée.');
    }

    public function setCurrent(SchoolYear $schoolYear): JsonResponse
    {
        DB::transaction(function () use ($schoolYear) {
            SchoolYear::query()->update(['is_current' => false]);
            $schoolYear->is_current = true;
            if ($schoolYear->status === 'planned') {
                $schoolYear->status = 'active';
            }
            $schoolYear->save();
        });

        return ApiResponse::success(
            (new SchoolYearResource($schoolYear->fresh()))->resolve(),
            'Année courante mise à jour.'
        );
    }
}
