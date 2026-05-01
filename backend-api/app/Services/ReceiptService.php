<?php

namespace App\Services;

use App\Models\Payment;
use App\Support\ReportCardTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class ReceiptService
{
    public function generatePaymentReceiptPdf(Payment $payment): void
    {
        $payment->loadMissing(['student']);

        $html = view('finance.receipt', [
            'payment' => $payment,
            'student' => $payment->student,
            'school' => ReportCardTemplate::get()['school'] ?? [],
        ])->render();

        $pdf = Pdf::loadHTML($html)->setPaper('a4');

        $fileName = "recu_paiement_{$payment->id}.pdf";
        $path = "receipts/{$fileName}";

        Storage::disk('local')->put($path, $pdf->output());

        $payment->receipt_pdf_path = $path;
        $payment->save();
    }
}

