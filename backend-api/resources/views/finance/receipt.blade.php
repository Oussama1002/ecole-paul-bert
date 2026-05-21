<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Reçu de paiement</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; margin: 0; }
        .page { padding: 24px 28px; }
        .muted { color: #6b7280; }
        h1 { font-size: 18px; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
        th { text-align: left; background: #f9fafb; }
        .kpi { display:inline-block; margin-right: 16px; }
        .kpi b { font-size: 14px; }
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
        $studentName = trim((string) (($student?->last_name ?? '').' '.($student?->first_name ?? '')));
    @endphp
    <div class="page">
    <div class="header">
        @if($logoAbsolute)
            <div class="logo"><img src="file://{{ $logoAbsolute }}" alt="logo"></div>
        @endif
        <div class="brand">
            <h1>Reçu de paiement</h1>
            <div class="muted">
                <b>{{ $school['name'] ?? 'Établissement' }}</b>
                @if(!empty($school['city'])) — {{ $school['city'] }} @endif
            </div>
        </div>
    </div>
    <div class="muted">
        <div><b>Référence :</b> {{ $payment->payment_reference ?? ('#'.$payment->id) }}</div>
        <div><b>Date :</b> {{ $payment->payment_date?->format('d/m/Y') ?? '—' }}</div>
        <div class="word-break"><b>Élève :</b> {{ $studentName !== '' ? $studentName : '—' }} ({{ $student?->student_code ?? '—' }})</div>
    </div>

    <div style="margin-top: 12px;">
        <span class="kpi"><span class="muted">Montant</span><br><b>{{ number_format((float)$payment->amount, 2, ',', ' ') }} FCFA</b></span>
        <span class="kpi"><span class="muted">Méthode</span><br><b>{{ $payment->payment_method ?: '—' }}</b></span>
        <span class="kpi"><span class="muted">Statut</span><br><b>{{ $payment->status ?: '—' }}</b></span>
    </div>

    <h2 style="font-size:14px; margin-top: 18px;">Détails</h2>
    <table>
        <tbody>
        <tr><th>Facture</th><td>{{ $payment->invoice?->invoice_number ?? ($payment->invoice_id ? '#'.$payment->invoice_id : '—') }}</td></tr>
        <tr><th>Affectation frais</th><td>{{ $payment->fee_assignment_id ? ('#'.$payment->fee_assignment_id) : '—' }}</td></tr>
        <tr><th>Réf. transaction</th><td>{{ $payment->transaction_reference ?? '—' }}</td></tr>
        <tr><th>Note</th><td class="word-break">{{ $payment->note ?? '—' }}</td></tr>
        </tbody>
    </table>
    </div>
</body>
</html>

