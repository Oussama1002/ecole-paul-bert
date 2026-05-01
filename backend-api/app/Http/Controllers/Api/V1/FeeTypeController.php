<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Finance\StoreFeeTypeRequest;
use App\Http\Requests\Api\V1\Finance\UpdateFeeTypeRequest;
use App\Http\Responses\ApiResponse;
use App\Models\FeeType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeeTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'is_active' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = FeeType::query()->orderBy('name');
        if ($request->has('is_active')) {
            $q->where('status', $request->boolean('is_active') ? 'active' : 'inactive');
        }

        $p = $q->paginate(min((int) $request->input('per_page', 50), 100));

        return ApiResponse::success([
            'items' => $p->getCollection()->map(fn (FeeType $ft) => $this->toDto($ft)),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Types de frais.');
    }

    public function show(FeeType $feeType): JsonResponse
    {
        return ApiResponse::success($this->toDto($feeType), 'Type de frais.');
    }

    public function store(StoreFeeTypeRequest $request): JsonResponse
    {
        $ft = FeeType::query()->create($this->mapValidatedToRow($request->validated()));

        return ApiResponse::success($this->toDto($ft), 'Type de frais créé.', 201);
    }

    public function update(UpdateFeeTypeRequest $request, FeeType $feeType): JsonResponse
    {
        $feeType->fill($this->mapValidatedToRow($request->validated(), partial: true));
        $feeType->save();

        return ApiResponse::success($this->toDto($feeType->fresh()), 'Type de frais mis à jour.');
    }

    public function destroy(FeeType $feeType): JsonResponse
    {
        $feeType->delete();

        return ApiResponse::success(null, 'Type de frais supprimé.');
    }

    /**
     * @return array<string, mixed>
     */
    private function toDto(FeeType $ft): array
    {
        $freq = (string) $ft->frequency;

        return [
            'id' => $ft->id,
            'name' => $ft->name,
            'code' => $ft->code,
            'frequency' => match ($freq) {
                'one_time' => 'once',
                default => $freq,
            },
            'default_amount' => (string) $ft->amount,
            'is_active' => $ft->status === 'active',
            'description' => $ft->description,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function mapValidatedToRow(array $data, bool $partial = false): array
    {
        $row = [];
        foreach (['name', 'code', 'description'] as $k) {
            if (array_key_exists($k, $data)) {
                $row[$k] = $data[$k];
            }
        }
        if (array_key_exists('default_amount', $data)) {
            $row['amount'] = $data['default_amount'] ?? 0;
        } elseif (! $partial) {
            $row['amount'] = 0;
        }
        if (array_key_exists('frequency', $data)) {
            $row['frequency'] = match ($data['frequency']) {
                'once' => 'one_time',
                default => $data['frequency'],
            };
        }
        if (array_key_exists('is_active', $data)) {
            $row['status'] = $data['is_active'] ? 'active' : 'inactive';
        } elseif (! $partial) {
            $row['status'] = 'active';
        }
        if (! $partial) {
            $row['is_mandatory'] = true;
        }

        return $row;
    }
}

