<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Facture</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; margin: 0; }
        .page { padding: 24px 28px; }
        .muted { color: #6b7280; }
        h1 { font-size: 18px; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
        th { text-align: left; background: #f9fafb; }
        .right { text-align: right; }
        .header { display: table; width: 100%; margin-bottom: 10px; }
        .header .logo { display: table-cell; vertical-align: middle; width: 72px; }
        .header .logo img { max-width: 64px; max-height: 64px; }
        .header .brand { display: table-cell; vertical-align: middle; }
        .word-break { word-break: break-word; overflow-wrap: anywhere; }
    </style>
</head>
<body>
    @php
        $logoAbsolute = null;
        if (! empty($school['logo_path'])) {
            $candidate = storage_path('app/'.$school['logo_path']);
            if (is_file($candidate)) {
                $logoAbsolute = $candidate;
            }
        }
        $studentName = trim((string) (($invoice->student->last_name ?? '').' '.($invoice->student->first_name ?? '')));
    @endphp
    <div class="page">
    <div class="header">
        @if($logoAbsolute)
            <div class="logo"><img src="file://{{ $logoAbsolute }}" alt="logo"></div>
        @endif
        <div class="brand">
            <h1>Facture</h1>
            <div class="muted">
                <b>{{ $school['name'] ?? 'Établissement' }}</b>
                @if(!empty($school['city'])) — {{ $school['city'] }} @endif
            </div>
        </div>
    </div>
    <div class="muted">
        <div><b>N° :</b> {{ $invoice->invoice_number ?? ('#'.$invoice->id) }}</div>
        <div><b>Date d’émission :</b> {{ $invoice->issue_date?->format('d/m/Y') ?? '—' }}</div>
        <div><b>Échéance :</b> {{ $invoice->due_date?->format('d/m/Y') ?? '—' }}</div>
        <div><b>Statut :</b> {{ $invoice->status ?: '—' }}</div>
        @if($invoice->student)
            <div class="word-break"><b>Élève :</b> {{ $studentName !== '' ? $studentName : '—' }} ({{ $invoice->student->student_code ?? '—' }})</div>
        @endif
    </div>

    <h2 style="font-size:14px; margin-top: 18px;">Lignes</h2>
    <table>
        <thead>
        <tr>
            <th>Libellé</th>
            <th class="right">Montant</th>
        </tr>
        </thead>
        <tbody>
        @foreach($invoice->items as $it)
            <tr>
                <td class="word-break">{{ $it->label ?: '—' }}</td>
                <td class="right">{{ number_format((float)$it->amount, 2, ',', ' ') }} MAD</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <div style="margin-top: 16px;">
        <div><span class="muted">Sous-total</span> {{ number_format((float)$invoice->subtotal, 2, ',', ' ') }} MAD</div>
        <div><span class="muted">Remise</span> {{ number_format((float)$invoice->discount_amount, 2, ',', ' ') }} MAD</div>
        <div><span class="muted">Taxes</span> {{ number_format((float)$invoice->tax_amount, 2, ',', ' ') }} MAD</div>
        <div><b>Total</b> {{ number_format((float)$invoice->total_amount, 2, ',', ' ') }} MAD</div>
        <div><span class="muted">Payé</span> {{ number_format((float)$invoice->amount_paid, 2, ',', ' ') }} MAD</div>
        <div><b>Reste dû</b> {{ number_format((float)$invoice->amount_due, 2, ',', ' ') }} MAD</div>
    </div>
    </div>
</body>
</html>
