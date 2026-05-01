<?php

namespace App\Services;

use App\Models\FeeAssignment;
use App\Models\Invoice;
use App\Models\InvoiceItem;

class FinanceCalculatorService
{
    public function recomputeFeeAssignment(FeeAssignment $fa): void
    {
        $due = max(0.0, (float) $fa->amount_due - (float) $fa->discount_amount - (float) $fa->scholarship_amount);
        $paid = max(0.0, (float) $fa->amount_paid);
        $balance = max(0.0, round($due - $paid, 2));

        $fa->balance = $balance;

        if ($fa->cancelled_at !== null || $fa->status === 'cancelled') {
            $fa->status = 'cancelled';
        } elseif ($paid <= 0.0) {
            $fa->status = 'pending';
        } elseif ($balance <= 0.0) {
            $fa->status = 'paid';
        } else {
            $fa->status = 'partial';
        }
    }

    public function recomputeInvoiceTotals(Invoice $invoice): void
    {
        $subtotal = (float) InvoiceItem::query()->where('invoice_id', $invoice->id)->sum('amount');
        $discount = (float) $invoice->discount_amount;
        $tax = (float) $invoice->tax_amount;
        $total = max(0.0, round($subtotal - $discount + $tax, 2));

        $paid = max(0.0, (float) $invoice->amount_paid);
        $due = max(0.0, round($total - $paid, 2));

        $invoice->subtotal = $subtotal;
        $invoice->total_amount = $total;
        $invoice->amount_due = $due;

        if ($invoice->cancelled_at !== null || $invoice->status === 'cancelled') {
            $invoice->status = 'cancelled';
        } elseif ($paid <= 0.0) {
            $invoice->status = 'issued';
        } elseif ($due <= 0.0) {
            $invoice->status = 'paid';
        } else {
            $invoice->status = 'partial';
        }
    }
}

