<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Payment;
use App\Support\ReportCardTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class ReceiptService
{
    public function generatePaymentReceiptPdf(Payment $payment): void
    {
        $payment->loadMissing(['student', 'invoice:id,invoice_number']);

        $html = view('finance.receipt', [
            'payment' => $payment,
            'student' => $payment->student,
            'school' => ReportCardTemplate::get()['school'] ?? [],
        ])->render();

        $pdf = Pdf::loadHTML($html)->setPaper('a4');

        $fileName = "recu_paiement_{$payment->id}.pdf";
        $path = "receipts/{$fileName}";

        $content = $pdf->output();
        Storage::disk('local')->put($path, $content);

        $payment->receipt_pdf_path = $path;
        $payment->save();

        // Register in documents table
        try {
            Document::updateOrCreate(
                ['payment_id' => $payment->id, 'document_type' => 'receipt'],
                [
                    'category'   => 'finance',
                    'title'      => 'Reçu paiement — '.($payment->payment_reference ?? "#{$payment->id}"),
                    'file_name'  => $fileName,
                    'file_path'  => $path,
                    'mime_type'  => 'application/pdf',
                    'file_size'  => strlen($content),
                    'student_id' => $payment->student_id ?? null,
                    'status'     => 'active',
                ]
            );
        } catch (\Throwable) {}
    }
}

