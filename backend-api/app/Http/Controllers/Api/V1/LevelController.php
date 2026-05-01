<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Levels\IndexLevelRequest;
use App\Http\Requests\Api\V1\Levels\StoreLevelRequest;
use App\Http\Requests\Api\V1\Levels\UpdateLevelRequest;
use App\Http\Resources\LevelResource;
use App\Http\Responses\ApiResponse;
use App\Models\Level;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class LevelController extends Controller
{
    public function index(IndexLevelRequest $request): JsonResponse
    {
        $query = Level::query();

        if ($search = $request->validated('search')) {
            $s = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(code) LIKE ?', [$s]);
            });
        }

        $query->orderBy($request->validated('sort_by'), $request->validated('sort_order'));

        $paginator = $query->paginate((int) $request->validated('per_page'))->withQueryString();

        return ApiResponse::success([
            'items' => LevelResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Niveaux.');
    }

    public function show(Level $level): JsonResponse
    {
        return ApiResponse::success(
            (new LevelResource($level))->resolve(),
            'Niveau.'
        );
    }

    public function store(StoreLevelRequest $request): JsonResponse
    {
        $level = Level::query()->create($request->validated());

        return ApiResponse::success(
            (new LevelResource($level))->resolve(),
            'Niveau créé.',
            201
        );
    }

    public function update(UpdateLevelRequest $request, Level $level): JsonResponse
    {
        $level->fill($request->validated());
        $level->save();

        return ApiResponse::success(
            (new LevelResource($level->fresh()))->resolve(),
            'Niveau mis à jour.'
        );
    }

    public function destroy(Level $level): JsonResponse
    {
        if ($level->classes()->exists()) {
            return ApiResponse::error(
                'Impossible de supprimer : des classes sont rattachées à ce niveau.',
                [],
                422
            );
        }
        if ($level->subjects()->exists()) {
            return ApiResponse::error(
                'Impossible de supprimer : des matières sont rattachées à ce niveau.',
                [],
                422
            );
        }

        $level->delete();

        return ApiResponse::success(null, 'Niveau supprimé.');
    }
}
