<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Finance\StoreExpenseCategoryRequest;
use App\Http\Requests\Api\V1\Finance\UpdateExpenseCategoryRequest;
use App\Http\Responses\ApiResponse;
use App\Models\ExpenseCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'is_active' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = ExpenseCategory::query()->orderBy('name');
        if ($request->has('is_active')) {
            $q->where('status', $request->boolean('is_active') ? 'active' : 'inactive');
        }

        $p = $q->paginate(min((int) $request->input('per_page', 50), 100));

        return ApiResponse::success([
            'items' => $p->getCollection()->map(fn (ExpenseCategory $c) => $this->toDto($c)),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Catégories de dépenses.');
    }

    public function show(ExpenseCategory $expenseCategory): JsonResponse
    {
        return ApiResponse::success($this->toDto($expenseCategory), 'Catégorie.');
    }

    public function store(StoreExpenseCategoryRequest $request): JsonResponse
    {
        $data = $request->validated();
        $row = [
            'name' => $data['name'],
            'code' => $data['code'],
            'description' => $data['description'] ?? null,
            'status' => ($data['is_active'] ?? true) ? 'active' : 'inactive',
        ];
        $cat = ExpenseCategory::query()->create($row);

        return ApiResponse::success($this->toDto($cat), 'Catégorie créée.', 201);
    }

    public function update(UpdateExpenseCategoryRequest $request, ExpenseCategory $expenseCategory): JsonResponse
    {
        $data = $request->validated();
        if (array_key_exists('name', $data)) {
            $expenseCategory->name = $data['name'];
        }
        if (array_key_exists('code', $data)) {
            $expenseCategory->code = $data['code'];
        }
        if (array_key_exists('description', $data)) {
            $expenseCategory->description = $data['description'];
        }
        if (array_key_exists('is_active', $data)) {
            $expenseCategory->status = $data['is_active'] ? 'active' : 'inactive';
        }
        $expenseCategory->save();

        return ApiResponse::success($this->toDto($expenseCategory->fresh()), 'Catégorie mise à jour.');
    }

    public function destroy(ExpenseCategory $expenseCategory): JsonResponse
    {
        $expenseCategory->delete();

        return ApiResponse::success(null, 'Catégorie supprimée.');
    }

    /**
     * @return array<string, mixed>
     */
    private function toDto(ExpenseCategory $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'code' => $c->code,
            'is_active' => $c->status === 'active',
            'description' => $c->description,
        ];
    }
}

