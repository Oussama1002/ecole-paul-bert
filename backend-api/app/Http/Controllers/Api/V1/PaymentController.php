<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Finance\StorePaymentRequest;
use App\Http\Responses\ApiResponse;
use App\Models\FeeAssignment;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\AuditLogger;
use App\Services\FinanceCalculatorService;
use App\Services\FinanceNumberService;
use App\Services\ReceiptService;
use App\Services\SystemNotificationDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function __construct(
        private FinanceCalculatorService $calc,
        private FinanceNumberService $numbers,
        private ReceiptService $receipts,
        private AuditLogger $audit,
        private SystemNotificationDispatcher $notify
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'student_id' => ['nullable', 'integer', 'exists:students,id'],
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'invoice_id' => ['nullable', 'integer', 'exists:invoices,id'],
            'status' => ['nullable', 'in:confirmed,cancelled'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = Payment::query()
            ->with(['student:id,first_name,last_name', 'invoice:id,invoice_number'])
            ->orderByDesc('payment_date');
        foreach (['student_id', 'school_year_id', 'invoice_id'] as $k) {
            if ($request->filled($k)) {
                $q->where($k, (int) $request->input($k));
            }
        }
        if ($request->filled('status')) {
            $q->where('status', (string) $request->input('status'));
        }

        $p = $q->paginate(min((int) $request->input('per_page', 30), 100))->withQueryString();

        return ApiResponse::success([
            'items' => $p->getCollection()->map(fn (Payment $pay) => $this->toDto($pay)),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Paiements.');
    }

    public function show(Payment $payment): JsonResponse
    {
        $payment->loadMissing(['student:id,first_name,last_name', 'invoice:id,invoice_number']);

        return ApiResponse::success($this->toDto($payment), 'Paiement.');
    }

    public function store(StorePaymentRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (empty($data['invoice_id']) && empty($data['fee_assignment_id'])) {
            throw ValidationException::withMessages([
                'invoice_id' => ['Sélectionnez une facture ou une affectation de frais à régler.'],
            ]);
        }
        if (! empty($data['invoice_id']) && ! empty($data['fee_assignment_id'])) {
            throw ValidationException::withMessages([
                'invoice_id' => ['Choisissez une seule cible de paiement (facture ou affectation).'],
            ]);
        }

        $amount = (float) ($data['amount'] ?? 0);
        $invoice = null;
        $feeAssignment = null;
        if (! empty($data['invoice_id'])) {
            /** @var Invoice $invoice */
            $invoice = Invoice::query()->findOrFail((int) $data['invoice_id']);
            if ($invoice->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'invoice_id' => ['Cette facture est annulée et ne peut pas recevoir de paiement.'],
                ]);
            }
            if ((int) $invoice->student_id !== (int) $data['student_id']) {
                throw ValidationException::withMessages([
                    'student_id' => ['La facture sélectionnée n’appartient pas à cet élève.'],
                ]);
            }
            if ((int) $invoice->school_year_id !== (int) $data['school_year_id']) {
                throw ValidationException::withMessages([
                    'school_year_id' => ['La facture sélectionnée ne correspond pas à l’année scolaire choisie.'],
                ]);
            }
            if ((float) $invoice->amount_due <= 0.0) {
                throw ValidationException::withMessages([
                    'invoice_id' => ['Cette facture est déjà soldée.'],
                ]);
            }
            if ($amount > (float) $invoice->amount_due) {
                throw ValidationException::withMessages([
                    'amount' => ['Le montant dépasse le reste à payer de cette facture.'],
                ]);
            }
        }
        if (! empty($data['fee_assignment_id'])) {
            /** @var FeeAssignment $feeAssignment */
            $feeAssignment = FeeAssignment::query()->findOrFail((int) $data['fee_assignment_id']);
            if ($feeAssignment->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'fee_assignment_id' => ['Cette affectation est annulée et ne peut pas recevoir de paiement.'],
                ]);
            }
            if ((int) $feeAssignment->student_id !== (int) $data['student_id']) {
                throw ValidationException::withMessages([
                    'student_id' => ['Cette affectation de frais n’appartient pas à cet élève.'],
                ]);
            }
            if ((int) $feeAssignment->school_year_id !== (int) $data['school_year_id']) {
                throw ValidationException::withMessages([
                    'school_year_id' => ['Cette affectation ne correspond pas à l’année scolaire choisie.'],
                ]);
            }
            if ((float) $feeAssignment->balance <= 0.0) {
                throw ValidationException::withMessages([
                    'fee_assignment_id' => ['Cette affectation est déjà soldée.'],
                ]);
            }
            if ($amount > (float) $feeAssignment->balance) {
                throw ValidationException::withMessages([
                    'amount' => ['Le montant dépasse le solde restant de cette affectation.'],
                ]);
            }
        }

        $data['received_by'] = $request->user()?->id;
        $data['status'] = 'confirmed';

        DB::beginTransaction();
        try {
            /** @var Payment $pay */
            $pay = Payment::query()->create($data);
            $pay->payment_reference = $this->numbers->paymentReference($pay);
            $pay->save();

            if ($invoice) {
                $invoice->amount_paid = (float) $invoice->amount_paid + (float) $pay->amount;
                $this->calc->recomputeInvoiceTotals($invoice);
                $invoice->save();
            }

            if ($feeAssignment) {
                $feeAssignment->amount_paid = (float) $feeAssignment->amount_paid + (float) $pay->amount;
                $this->calc->recomputeFeeAssignment($feeAssignment);
                $feeAssignment->save();
            }

            DB::commit();
        } catch (ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Throwable $e) {
            DB::rollBack();
            return ApiResponse::error('Erreur enregistrement paiement.', [], 500);
        }

        // Receipt generation after commit
        $this->receipts->generatePaymentReceiptPdf($pay);

        $pay = $pay->fresh(['student:id,first_name,last_name', 'invoice:id,invoice_number']);
        $this->audit->log(
            $request->user(),
            'payment.created',
            $pay,
            null,
            $pay->only(['amount', 'payment_method', 'student_id', 'invoice_id', 'fee_assignment_id', 'school_year_id', 'status'])
        );

        $actorId = (int) ($request->user()?->id ?? 0);
        if ($actorId > 0) {
            $this->notify->notifyUser(
                $actorId,
                'payment.recorded',
                'Paiement enregistré',
                'Réf. '.$pay->payment_reference.' — '.number_format((float) $pay->amount, 2, ',', ' ').' FCFA',
                ['payment_id' => $pay->id]
            );
        }
        $this->notify->notifyUsersWithPermission(
            'notifications.view',
            'payment.recorded',
            'Nouveau paiement',
            'Réf. '.$pay->payment_reference.' — '.number_format((float) $pay->amount, 2, ',', ' ').' FCFA',
            ['payment_id' => $pay->id],
            $actorId > 0 ? $actorId : null
        );

        return ApiResponse::success($this->toDto($pay), 'Paiement enregistré.', 201);
    }

    public function cancel(Request $request, Payment $payment): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($payment->status === 'cancelled') {
            return ApiResponse::success($this->toDto($payment), 'Paiement déjà annulé.');
        }
        $before = $payment->only(['status', 'cancel_reason', 'cancelled_at', 'amount', 'invoice_id', 'fee_assignment_id']);

        DB::beginTransaction();
        try {
            $payment->status = 'cancelled';
            $payment->cancelled_at = now();
            $payment->cancelled_by = $request->user()?->id;
            $payment->cancel_reason = $request->input('reason');
            $payment->save();

            if ($payment->invoice_id) {
                $inv = Invoice::query()->find($payment->invoice_id);
                if ($inv) {
                    $inv->amount_paid = max(0.0, (float) $inv->amount_paid - (float) $payment->amount);
                    $this->calc->recomputeInvoiceTotals($inv);
                    $inv->save();
                }
            }

            if ($payment->fee_assignment_id) {
                $fa = FeeAssignment::query()->find($payment->fee_assignment_id);
                if ($fa) {
                    $fa->amount_paid = max(0.0, (float) $fa->amount_paid - (float) $payment->amount);
                    $this->calc->recomputeFeeAssignment($fa);
                    $fa->save();
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return ApiResponse::error('Erreur annulation paiement.', [], 500);
        }

        $this->audit->log(
            $request->user(),
            'payment.cancelled',
            $payment,
            $before,
            $payment->only(['status', 'cancel_reason', 'cancelled_at', 'amount', 'invoice_id', 'fee_assignment_id'])
        );

        return ApiResponse::success($this->toDto($payment->fresh(['student:id,first_name,last_name', 'invoice:id,invoice_number'])), 'Paiement annulé.');
    }

    public function receipt(Payment $payment)
    {
        if (! $payment->receipt_pdf_path || ! Storage::disk('local')->exists($payment->receipt_pdf_path)) {
            $this->receipts->generatePaymentReceiptPdf($payment);
            $payment = $payment->fresh();
        }

        $name = "recu_{$payment->payment_reference}.pdf";

        return Storage::disk('local')->download($payment->receipt_pdf_path, $name, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function toDto(Payment $pay): array
    {
        $student = $pay->relationLoaded('student')
            ? $pay->student
            : $pay->student()->first(['id', 'first_name', 'last_name']);
        $invoice = $pay->relationLoaded('invoice')
            ? $pay->invoice
            : ($pay->invoice_id ? $pay->invoice()->first(['id', 'invoice_number']) : null);
        return [
            'id' => $pay->id,
            'student_id' => (int) $pay->student_id,
            'student_name' => $student
                ? trim((string) ($student->last_name.' '.$student->first_name))
                : null,
            'school_year_id' => (int) $pay->school_year_id,
            'invoice_id' => $pay->invoice_id ? (int) $pay->invoice_id : null,
            'invoice_number' => $invoice?->invoice_number,
            'fee_assignment_id' => $pay->fee_assignment_id ? (int) $pay->fee_assignment_id : null,
            'payment_reference' => $pay->payment_reference,
            'payment_date' => $pay->payment_date?->format('Y-m-d'),
            'amount' => (string) $pay->amount,
            'payment_method' => $pay->payment_method,
            'transaction_reference' => $pay->transaction_reference,
            'status' => $pay->status,
            'note' => $pay->note,
            'cancelled_at' => $pay->cancelled_at?->toIso8601String(),
            'has_receipt' => (bool) $pay->receipt_pdf_path,
        ];
    }
}

