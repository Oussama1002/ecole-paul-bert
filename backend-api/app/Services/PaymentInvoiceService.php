<?php

namespace App\Services;

use App\Models\FeeAssignment;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use Carbon\Carbon;

class PaymentInvoiceService
{
    public function __construct(
        private FinanceCalculatorService $calc,
        private FinanceNumberService $numbers,
        private FeePaymentDueDateService $dueDates
    ) {}

    public function createForFeePayment(
        FeeAssignment $feeAssignment,
        float $amount,
        string $paymentDate,
        ?int $createdBy = null
    ): Invoice {
        $feeAssignment->loadMissing('feeType:id,name,code');
        $feeName = $feeAssignment->feeType?->name ?? 'Frais scolaires';
        $issueDate = Carbon::parse($paymentDate)->toDateString();
        $dueDate = $this->dueDates->nextPaymentDate($feeAssignment, Carbon::parse($paymentDate))
            ?? $feeAssignment->due_date
            ?? Carbon::parse($issueDate);

        $inv = Invoice::query()->create([
            'student_id' => (int) $feeAssignment->student_id,
            'school_year_id' => (int) $feeAssignment->school_year_id,
            'issue_date' => $issueDate,
            'due_date' => Carbon::parse($dueDate)->toDateString(),
            'discount_amount' => 0,
            'tax_amount' => 0,
            'amount_paid' => 0,
            'status' => 'issued',
            'notes' => 'Facture générée automatiquement lors du paiement.',
            'created_by' => $createdBy,
        ]);

        $inv->invoice_number = $this->numbers->invoiceNumber($inv);
        $inv->save();

        InvoiceItem::query()->create([
            'invoice_id' => $inv->id,
            'fee_assignment_id' => $feeAssignment->id,
            'label' => $feeName,
            'amount' => $amount,
        ]);

        $this->calc->recomputeInvoiceTotals($inv);
        $inv->save();

        return $inv->fresh();
    }
}
