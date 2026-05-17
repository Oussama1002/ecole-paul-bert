<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Finance\StoreExpenseDocumentRequest;
use App\Http\Requests\Api\V1\Finance\StoreExpenseRequest;
use App\Http\Requests\Api\V1\Finance\UpdateExpenseRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Document;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'expense_category_id' => ['nullable', 'integer', 'exists:expense_categories,id'],
            'cost_type' => ['nullable', 'in:fixed,variable'],
            'status' => ['nullable', 'in:active,cancelled'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = Expense::query()->orderByDesc('expense_date');
        foreach (['school_year_id', 'expense_category_id'] as $k) {
            if ($request->filled($k)) {
                $q->where($k, (int) $request->input($k));
            }
        }
        if ($request->filled('cost_type')) {
            $q->where('cost_type', (string) $request->input('cost_type'));
        }
        if ($request->filled('status')) {
            $q->where('status', (string) $request->input('status'));
        }
        if ($request->filled('from')) {
            $q->whereDate('expense_date', '>=', (string) $request->input('from'));
        }
        if ($request->filled('to')) {
            $q->whereDate('expense_date', '<=', (string) $request->input('to'));
        }

        $p = $q->paginate(min((int) $request->input('per_page', 30), 100))->withQueryString();

        return ApiResponse::success([
            'items' => $p->getCollection()->map(fn (Expense $e) => $this->toDto($e)),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Dépenses.');
    }

    public function show(Expense $expense): JsonResponse
    {
        return ApiResponse::success($this->toDto($expense, true), 'Dépense.');
    }

    public function nextReference(): JsonResponse
    {
        $year = now()->year;
        $prefix = 'DEP-' . $year . '-';

        $last = Expense::query()
            ->where('reference', 'like', $prefix . '%')
            ->orderByDesc('reference')
            ->value('reference');

        $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return ApiResponse::success(
            ['reference' => $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT)],
            'Prochaine référence.'
        );
    }

    public function store(StoreExpenseRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()?->id;
        $data['status'] = 'active';

        $expense = Expense::query()->create($data);

        return ApiResponse::success($this->toDto($expense), 'Dépense créée.', 201);
    }

    public function update(UpdateExpenseRequest $request, Expense $expense): JsonResponse
    {
        if ($expense->status === 'cancelled') {
            throw ValidationException::withMessages([
                'status' => ['Dépense annulée : modification interdite.'],
            ]);
        }

        $expense->fill($request->validated());
        $expense->save();

        return ApiResponse::success($this->toDto($expense->fresh()), 'Dépense mise à jour.');
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $expense->delete();

        return ApiResponse::success(null, 'Dépense supprimée.');
    }

    public function cancel(Request $request, Expense $expense): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $expense->status = 'cancelled';
        $expense->cancelled_at = now();
        $expense->cancelled_by = $request->user()?->id;
        $expense->cancel_reason = $request->input('reason');
        $expense->save();

        return ApiResponse::success($this->toDto($expense->fresh()), 'Dépense annulée.');
    }

    public function addDocument(StoreExpenseDocumentRequest $request, Expense $expense): JsonResponse
    {
        $file = $request->file('file');
        $ext = $file->getClientOriginalExtension() ?: 'bin';
        $safe = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        $filename = $safe.'_'.Str::uuid().'.'.$ext;
        $dir = 'expense_documents/'.$expense->id;
        $path = $file->storeAs($dir, $filename, 'public');

        $doc = Document::query()->create([
            'document_type' => $request->validated('document_type') ?: 'expense_attachment',
            'category' => 'expense',
            'title' => $request->validated('title') ?: $file->getClientOriginalName(),
            'description' => $request->validated('description'),
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'expense_id' => $expense->id,
            'uploaded_by' => $request->user()?->id,
            'is_confidential' => false,
            'status' => 'active',
        ]);

        return ApiResponse::success([
            'id' => $doc->id,
            'title' => $doc->title,
            'file_path' => $doc->file_path,
        ], 'Pièce jointe ajoutée.', 201);
    }

    public function deleteDocument(Request $request, Document $document): JsonResponse
    {
        if (! $document->expense_id) {
            return ApiResponse::error('Document non lié à une dépense.', [], 422);
        }

        if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }
        $document->delete();

        return ApiResponse::success(null, 'Pièce jointe supprimée.');
    }

    /**
     * @return array<string, mixed>
     */
    private function toDto(Expense $e, bool $withDocs = false): array
    {
        $out = [
            'id' => $e->id,
            'school_year_id' => $e->school_year_id ? (int) $e->school_year_id : null,
            'expense_category_id' => (int) $e->expense_category_id,
            'expense_date' => $e->expense_date?->format('Y-m-d'),
            'amount' => (string) $e->amount,
            'cost_type' => $e->cost_type ?? 'variable',
            'vendor' => $e->vendor,
            'reference' => $e->reference,
            'description' => $e->description,
            'status' => $e->status,
            'cancelled_at' => $e->cancelled_at?->toIso8601String(),
        ];

        if ($withDocs) {
            $docs = Document::query()->where('expense_id', $e->id)->orderByDesc('created_at')->get();
            $out['documents'] = $docs->map(fn (Document $d) => [
                'id' => $d->id,
                'title' => $d->title,
                'file_path' => $d->file_path,
                'mime_type' => $d->mime_type,
                'file_size' => $d->file_size,
                'created_at' => $d->created_at?->toIso8601String(),
            ])->all();
        }

        return $out;
    }
}

