<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Finance\StoreInvoiceRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Services\AuditLogger;
use App\Services\FinanceCalculatorService;
use App\Services\FinanceNumberService;
use App\Services\SystemNotificationDispatcher;
use App\Support\ReportCardTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class InvoiceController extends Controller
{
    public function __construct(
        private FinanceCalculatorService $calc,
        private FinanceNumberService $numbers,
        private AuditLogger $audit,
        private SystemNotificationDispatcher $notify
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'student_id' => ['nullable', 'integer', 'exists:students,id'],
            'school_year_id' => ['nullable', 'integer', 'exists:school_years,id'],
            'status' => ['nullable', 'in:draft,issued,partial,paid,cancelled'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = Invoice::query()
            ->with('student:id,first_name,last_name')
            ->orderByDesc('issue_date');
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
            'items' => $p->getCollection()->map(fn (Invoice $inv) => $this->toDto($inv)),
            'meta' => [
                'current_page' => $p->currentPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
                'last_page' => $p->lastPage(),
            ],
        ], 'Factures.');
    }

    public function show(Invoice $invoice): JsonResponse
    {
        $invoice->loadMissing('student');

        return ApiResponse::success($this->toDto($invoice, true), 'Facture.');
    }

    public function downloadPdf(Invoice $invoice): Response
    {
        $invoice->loadMissing(['student', 'items']);

        $pdf = Pdf::loadView('finance.invoice', [
            'invoice' => $invoice,
            'school' => ReportCardTemplate::get()['school'] ?? [],
        ])->setPaper('a4');

        $content = $pdf->output();
        $slug    = preg_replace('/[^A-Za-z0-9_-]+/', '_', (string) $invoice->invoice_number);
        $name    = "facture_{$slug}.pdf";

        // Persist to disk and register in documents table
        try {
            $path = "documents/finance/invoices/{$invoice->id}/{$name}";
            Storage::disk('local')->put($path, $content);
            Document::updateOrCreate(
                ['invoice_id' => $invoice->id, 'document_type' => 'invoice'],
                [
                    'category'    => 'finance',
                    'title'       => 'Facture '.($invoice->invoice_number ?? 'sans numéro'),
                    'file_name'   => $name,
                    'file_path'   => $path,
                    'mime_type'   => 'application/pdf',
                    'file_size'   => strlen($content),
                    'student_id'  => $invoice->student_id ?? null,
                    'status'      => 'active',
                ]
            );
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('invoice.document_save failed: '.$e->getMessage());
        }

        return response($content, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$name.'"',
        ]);
    }

    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        $payload = $request->validated();

        $items = $payload['items'];
        unset($payload['items']);

        $payload['created_by'] = $request->user()?->id;
        $payload['status'] = $payload['status'] ?? 'issued';
        $payload['amount_paid'] = 0;
        $payload['discount_amount'] = $payload['discount_amount'] ?? 0;
        $payload['tax_amount'] = $payload['tax_amount'] ?? 0;

        DB::beginTransaction();
        try {
            /** @var Invoice $inv */
            $inv = Invoice::query()->create($payload);

            // Fill number from ID
            $inv->invoice_number = $this->numbers->invoiceNumber($inv);
            $inv->save();

            foreach ($items as $it) {
                InvoiceItem::query()->create([
                    'invoice_id' => $inv->id,
                    'fee_assignment_id' => $it['fee_assignment_id'] ?? null,
                    'label' => $it['label'],
                    'amount' => $it['amount'],
                ]);
            }

            $this->calc->recomputeInvoiceTotals($inv);
            $inv->save();

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('invoice.store failed: '.$e->getMessage());

            return ApiResponse::error('Erreur création facture.', [], 500);
        }

        $inv = $inv->fresh();
        try {
            $this->audit->log(
                $request->user(),
                'invoice.created',
                $inv,
                null,
                $inv->only(['student_id', 'school_year_id', 'invoice_number', 'status', 'total_amount'])
            );
            $actorId = (int) ($request->user()?->id ?? 0);
            $this->notify->notifyUsersWithPermission(
                'finance.manage',
                'invoice.created',
                'Nouvelle facture',
                'Facture '.$inv->invoice_number.' — '.number_format((float) $inv->total_amount, 2, ',', ' ').' FCFA',
                ['invoice_id' => $inv->id],
                $actorId > 0 ? $actorId : null
            );
        } catch (\Throwable) {
            // audit/notify failures must never block the invoice response
        }

        return ApiResponse::success($this->toDto($inv, true), 'Facture créée.', 201);
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        if ($invoice->status === 'cancelled') {
            throw ValidationException::withMessages([
                'status' => ['Impossible de modifier une facture annulée.'],
            ]);
        }

        $data = $request->validate([
            'student_id'      => ['nullable', 'integer', 'exists:students,id'],
            'issue_date'      => ['nullable', 'date'],
            'due_date'        => ['nullable', 'date'],
            'notes'           => ['nullable', 'string', 'max:2000'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_amount'      => ['nullable', 'numeric', 'min:0'],
            'items'           => ['nullable', 'array', 'min:1'],
            'items.*.label'   => ['required_with:items', 'string', 'max:255'],
            'items.*.amount'  => ['required_with:items', 'numeric', 'min:0'],
            'items.*.fee_assignment_id' => ['nullable', 'integer'],
        ]);

        $before = $invoice->only(['student_id', 'issue_date', 'due_date', 'notes', 'discount_amount', 'tax_amount', 'total_amount']);

        DB::beginTransaction();
        try {
            if (array_key_exists('student_id', $data) && $data['student_id'])  $invoice->student_id      = $data['student_id'];
            if (array_key_exists('issue_date', $data) && $data['issue_date'])  $invoice->issue_date       = $data['issue_date'];
            $invoice->due_date        = array_key_exists('due_date', $data)        ? $data['due_date']        : $invoice->due_date;
            $invoice->notes           = array_key_exists('notes', $data)           ? $data['notes']           : $invoice->notes;
            $invoice->discount_amount = array_key_exists('discount_amount', $data) ? $data['discount_amount'] : $invoice->discount_amount;
            $invoice->tax_amount      = array_key_exists('tax_amount', $data)      ? $data['tax_amount']      : $invoice->tax_amount;

            if (isset($data['items'])) {
                InvoiceItem::query()->where('invoice_id', $invoice->id)->delete();
                foreach ($data['items'] as $it) {
                    InvoiceItem::query()->create([
                        'invoice_id'        => $invoice->id,
                        'fee_assignment_id' => $it['fee_assignment_id'] ?? null,
                        'label'             => $it['label'],
                        'amount'            => $it['amount'],
                    ]);
                }
            }

            $this->calc->recomputeInvoiceTotals($invoice);
            $invoice->save();
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('invoice.update failed: '.$e->getMessage());
            return ApiResponse::error('Erreur modification facture.', [], 500);
        }

        try {
            $this->audit->log(
                $request->user(),
                'invoice.updated',
                $invoice,
                $before,
                $invoice->only(['due_date', 'notes', 'discount_amount', 'tax_amount', 'total_amount'])
            );
        } catch (\Throwable) {}

        return ApiResponse::success($this->toDto($invoice->fresh(), true), 'Facture mise à jour.');
    }

    public function issue(Request $request, Invoice $invoice): JsonResponse
    {
        if ($invoice->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Seules les factures en brouillon peuvent être émises.'],
            ]);
        }

        $invoice->status = 'issued';
        $this->calc->recomputeInvoiceTotals($invoice);
        $invoice->save();

        $this->audit->log(
            $request->user(),
            'invoice.issued',
            $invoice,
            null,
            $invoice->only(['invoice_number', 'status', 'total_amount'])
        );

        return ApiResponse::success($this->toDto($invoice->fresh(), true), 'Facture émise.');
    }

    public function cancel(Request $request, Invoice $invoice): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($invoice->status === 'paid') {
            throw ValidationException::withMessages([
                'status' => ['Impossible d’annuler une facture payée.'],
            ]);
        }
        $before = $invoice->only(['status', 'cancel_reason', 'cancelled_at', 'amount_due', 'amount_paid', 'total_amount']);

        $invoice->status = 'cancelled';
        $invoice->cancelled_at = now();
        $invoice->cancelled_by = $request->user()?->id;
        $invoice->cancel_reason = $request->input('reason');
        $this->calc->recomputeInvoiceTotals($invoice);
        $invoice->save();
        $this->audit->log(
            $request->user(),
            'invoice.cancelled',
            $invoice,
            $before,
            $invoice->only(['status', 'cancel_reason', 'cancelled_at', 'amount_due', 'amount_paid', 'total_amount'])
        );

        return ApiResponse::success($this->toDto($invoice->fresh(), true), 'Facture annulée.');
    }

    /**
     * @return array<string, mixed>
     */
    private function toDto(Invoice $inv, bool $withItems = false): array
    {
        $student = $inv->relationLoaded('student')
            ? $inv->student
            : $inv->student()->first(['id', 'first_name', 'last_name']);
        $out = [
            'id' => $inv->id,
            'student_id' => (int) $inv->student_id,
            'student_name' => $student
                ? trim((string) ($student->last_name.' '.$student->first_name))
                : null,
            'school_year_id' => (int) $inv->school_year_id,
            'invoice_number' => $inv->invoice_number,
            'status' => $inv->status,
            'issue_date' => $inv->issue_date?->format('Y-m-d'),
            'due_date' => $inv->due_date?->format('Y-m-d'),
            'subtotal' => (string) $inv->subtotal,
            'discount_amount' => (string) $inv->discount_amount,
            'tax_amount' => (string) $inv->tax_amount,
            'total_amount' => (string) $inv->total_amount,
            'amount_paid' => (string) $inv->amount_paid,
            'amount_due' => (string) $inv->amount_due,
            'cancelled_at' => $inv->cancelled_at?->toIso8601String(),
        ];

        if ($withItems) {
            $items = InvoiceItem::query()->where('invoice_id', $inv->id)->get();
            $out['items'] = $items->map(fn (InvoiceItem $it) => [
                'id' => $it->id,
                'label' => $it->label,
                'amount' => (string) $it->amount,
                'fee_assignment_id' => $it->fee_assignment_id ? (int) $it->fee_assignment_id : null,
            ])->all();
            $out['student'] = $student ? [
                'id' => (int) $student->id,
                'first_name' => (string) $student->first_name,
                'last_name' => (string) $student->last_name,
            ] : null;
            $out['payments'] = Payment::query()
                ->where('invoice_id', $inv->id)
                ->where('status', 'confirmed')
                ->orderByDesc('payment_date')
                ->get()
                ->map(fn (Payment $pay) => [
                    'id' => (int) $pay->id,
                    'payment_reference' => $pay->payment_reference,
                    'payment_date' => $pay->payment_date?->format('Y-m-d'),
                    'amount' => (string) $pay->amount,
                    'status' => (string) $pay->status,
                    'has_receipt' => (bool) $pay->receipt_pdf_path,
                ])->all();
        }

        return $out;
    }
}

