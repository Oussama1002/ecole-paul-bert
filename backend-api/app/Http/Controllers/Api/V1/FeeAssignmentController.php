<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Finance\StoreFeeAssignmentRequest;
use App\Http\Requests\Api\V1\Finance\UpdateFeeAssignmentRequest;
use App\Http\Responses\ApiResponse;
use App\Models\FeeAssignment;
use App\Models\FeeType;
use App\Services\FeePaymentDueDateService;
use App\Services\FinanceCalculatorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class FeeAssignmentController extends Controller
{
    public function __construct(
        private FinanceCalculatorService $calc,
        private FeePaymentDueDateService $dueDates
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'student_id' => ['nullable', 'integer', 'exists:students,id'],
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'status' => ['nullable', 'in:pending,partial,paid,overdue,cancelled,waived'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = FeeAssignment::query()->with('feeType:id,name,code,frequency,amount')->orderByDesc('created_at');
        foreach (['student_id', 'school_year_id'] as $k) {
            if ($request->filled($k)) {
                $q->where($k, (int) $request->input($k));
            }
        }
        if ($request->filled('status')) {
            $q->where('status', (string) $request->input('status'));
        }

        $p = $q->paginate(min((int) $request->input('per_page', 30), 100))->withQueryString();

        return ApiResponse::success([
            'items' => $p->getCollection()->map(fn (FeeAssignment $fa) => $this->toDto($fa)),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Affectations de frais.');
    }

    public function show(FeeAssignment $feeAssignment): JsonResponse
    {
        $feeAssignment->loadMissing('feeType:id,name,code,frequency,amount');

        return ApiResponse::success($this->toDto($feeAssignment), 'Affectation.');
    }

    public function store(StoreFeeAssignmentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()?->id;
        $data['amount_paid'] = 0;

        if (empty($data['due_date'])) {
            $feeType = FeeType::query()->find((int) $data['fee_type_id']);
            if ($feeType?->start_date !== null) {
                $data['due_date'] = $feeType->start_date->format('Y-m-d');
            }
        }

        $fa = FeeAssignment::query()->create($data);
        $this->calc->recomputeFeeAssignment($fa);
        $fa->save();

        return ApiResponse::success($this->toDto($fa->fresh()), 'Frais affectés.', 201);
    }

    public function update(UpdateFeeAssignmentRequest $request, FeeAssignment $feeAssignment): JsonResponse
    {
        if ($feeAssignment->status === 'cancelled') {
            throw ValidationException::withMessages([
                'status' => ['Affectation annulée : modification interdite.'],
            ]);
        }

        $feeAssignment->fill($request->validated());
        $this->calc->recomputeFeeAssignment($feeAssignment);
        $feeAssignment->save();

        return ApiResponse::success($this->toDto($feeAssignment->fresh()), 'Affectation mise à jour.');
    }

    public function cancel(Request $request, FeeAssignment $feeAssignment): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $feeAssignment->status = 'cancelled';
        $feeAssignment->cancelled_at = now();
        $feeAssignment->cancelled_by = $request->user()?->id;
        $feeAssignment->cancel_reason = $request->input('reason');
        $this->calc->recomputeFeeAssignment($feeAssignment);
        $feeAssignment->save();

        return ApiResponse::success($this->toDto($feeAssignment->fresh()), 'Affectation annulée.');
    }

    /**
     * @return array<string, mixed>
     */
    private function toDto(FeeAssignment $fa): array
    {
        $feeType = $fa->relationLoaded('feeType') ? $fa->feeType : null;

        return [
            'id' => $fa->id,
            'student_id' => (int) $fa->student_id,
            'school_year_id' => (int) $fa->school_year_id,
            'fee_type_id' => (int) $fa->fee_type_id,
            'fee_type' => $feeType ? [
                'id' => $feeType->id,
                'name' => $feeType->name,
                'code' => $feeType->code,
                'frequency' => match ((string) $feeType->frequency) {
                    'one_time' => 'once',
                    default => (string) $feeType->frequency,
                },
                'default_amount' => (string) $feeType->amount,
            ] : null,
            'amount_due' => (string) $fa->amount_due,
            'discount_amount' => (string) $fa->discount_amount,
            'scholarship_amount' => (string) $fa->scholarship_amount,
            'amount_paid' => (string) $fa->amount_paid,
            'balance' => (string) $fa->balance,
            'status' => $fa->status,
            'due_date' => $fa->due_date?->format('Y-m-d'),
            'next_due_date' => $this->dueDates->nextPaymentDate($fa)?->format('Y-m-d'),
            'notes' => $fa->notes,
            'cancelled_at' => $fa->cancelled_at?->toIso8601String(),
        ];
    }
}

