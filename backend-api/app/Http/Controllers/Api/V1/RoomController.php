<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Rooms\IndexRoomRequest;
use App\Http\Requests\Api\V1\Rooms\StoreRoomRequest;
use App\Http\Requests\Api\V1\Rooms\UpdateRoomRequest;
use App\Http\Resources\RoomResource;
use App\Http\Responses\ApiResponse;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class RoomController extends Controller
{
    public function index(IndexRoomRequest $request): JsonResponse
    {
        $query = Room::query();

        if ($search = $request->validated('search')) {
            $s = '%'.Str::lower($search).'%';
            $query->where(function ($q) use ($s) {
                $q->whereRaw('LOWER(name) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(code) LIKE ?', [$s])
                    ->orWhereRaw('LOWER(location) LIKE ?', [$s]);
            });
        }
        if ($type = $request->validated('room_type')) {
            $query->where('room_type', $type);
        }
        if ($status = $request->validated('status')) {
            $query->where('status', $status);
        }

        $query->orderBy($request->validated('sort_by'), $request->validated('sort_order'));

        $paginator = $query->paginate((int) $request->validated('per_page'))->withQueryString();

        return ApiResponse::success([
            'items' => RoomResource::collection($paginator->getCollection())->resolve(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ], 'Salles.');
    }

    public function show(Room $room): JsonResponse
    {
        return ApiResponse::success(
            (new RoomResource($room))->resolve(),
            'Salle.'
        );
    }

    public function store(StoreRoomRequest $request): JsonResponse
    {
        $room = Room::query()->create($request->validated());

        return ApiResponse::success(
            (new RoomResource($room))->resolve(),
            'Salle créée.',
            201
        );
    }

    public function update(UpdateRoomRequest $request, Room $room): JsonResponse
    {
        $room->fill($request->validated());
        $room->save();

        return ApiResponse::success(
            (new RoomResource($room->fresh()))->resolve(),
            'Salle mise à jour.'
        );
    }

    public function destroy(Room $room): JsonResponse
    {
        $room->delete();

        return ApiResponse::success(null, 'Salle supprimée.');
    }
}
