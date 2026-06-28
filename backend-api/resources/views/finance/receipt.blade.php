<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Reçu de paiement</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; margin: 0; background: #fff; }
        .page { padding: 28px 32px; }
        .muted { color: #6b7280; }
        .strong { color: #111827; font-weight: bold; }

        /* Header band */
        .header { display: table; width: 100%; margin-bottom: 18px; border-bottom: 3px solid #4f46e5; padding-bottom: 14px; }
        .header .logo { display: table-cell; vertical-align: middle; width: 80px; }
        .header .logo img { max-width: 70px; max-height: 70px; }
        .header .brand { display: table-cell; vertical-align: middle; padding-left: 4px; }
        .header h1 { font-size: 20px; margin: 0 0 4px; color: #4f46e5; letter-spacing: 0.5px; }
        .header .school { font-size: 12px; color: #374151; }

        /* Summary card */
        .summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; }
        .summary table { width: 100%; border-collapse: collapse; }
        .summary td { padding: 4px 0; vertical-align: top; font-size: 12px; }
        .summary td.label { color: #6b7280; width: 30%; }

        /* KPI band */
        .kpi-band { display: table; width: 100%; margin: 14px 0; border-collapse: separate; border-spacing: 6px 0; }
        .kpi { display: table-cell; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 10px 12px; width: 33%; }
        .kpi .label { font-size: 10px; color: #4338ca; text-transform: uppercase; letter-spacing: 0.4px; }
        .kpi .value { font-size: 16px; font-weight: bold; color: #1e1b4b; margin-top: 2px; }
        .kpi.amount { background: #ecfdf5; border-color: #6ee7b7; }
        .kpi.amount .label { color: #047857; }
        .kpi.amount .value { color: #065f46; font-size: 18px; }

        /* Details */
        h2 { font-size: 13px; margin: 18px 0 6px; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        table.details { width: 100%; border-collapse: collapse; }
        table.details th, table.details td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
        table.details th { text-align: left; background: #f9fafb; color: #6b7280; font-weight: normal; width: 30%; }

        .word-break { word-break: break-word; overflow-wrap: anywhere; }
        .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
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

        $methodLabels = [
            'cash' => 'Espèces',
            'card' => 'Carte',
            'transfer' => 'Virement',
            'check' => 'Chèque',
        ];
        $statusLabels = [
            'confirmed' => 'Confirmé',
            'pending'   => 'En attente',
            'cancelled' => 'Annulé',
            'refunded'  => 'Remboursé',
        ];
        $methodLabel = $methodLabels[$payment->payment_method] ?? ($payment->payment_method ?: '—');
        $statusLabel = $statusLabels[$payment->status] ?? ($payment->status ?: '—');
    @endphp
    <div class="page">

        <div class="header">
            @if($logoAbsolute)
                <div class="logo"><img src="file://{{ $logoAbsolute }}" alt="logo"></div>
            @endif
            <div class="brand">
                <h1>REÇU DE PAIEMENT</h1>
                <div class="school">
                    <span class="strong">{{ $school['name'] ?? 'Établissement' }}</span>
                    @if(!empty($school['city'])) — {{ $school['city'] }} @endif
                    @if(!empty($school['phone'])) · {{ $school['phone'] }} @endif
                </div>
            </div>
        </div>

        <div class="summary">
            <table>
                <tr>
                    <td class="label">Référence</td>
                    <td class="strong">{{ $payment->payment_reference ?? ('#'.$payment->id) }}</td>
                    <td class="label" style="width:20%;">Date</td>
                    <td class="strong">{{ $payment->payment_date?->format('d/m/Y') ?? '—' }}</td>
                </tr>
                <tr>
                    <td class="label">Élève</td>
                    <td class="strong word-break" colspan="3">
                        {{ $studentName !== '' ? $studentName : '—' }}
                        @if($student?->student_code)
                            <span class="muted"> · {{ $student->student_code }}</span>
                        @endif
                    </td>
                </tr>
            </table>
        </div>

        <div class="kpi-band">
            <div class="kpi amount">
                <div class="label">Montant payé</div>
                <div class="value">{{ number_format((float)$payment->amount, 2, ',', ' ') }} MAD</div>
            </div>
            <div class="kpi">
                <div class="label">Méthode</div>
                <div class="value">{{ $methodLabel }}</div>
            </div>
            <div class="kpi">
                <div class="label">Statut</div>
                <div class="value">{{ $statusLabel }}</div>
            </div>
        </div>

        <h2>Détails du paiement</h2>
        <table class="details">
            <tbody>
            <tr><th>Facture associée</th><td>{{ $payment->invoice?->invoice_number ?? ($payment->invoice_id ? '#'.$payment->invoice_id : '—') }}</td></tr>
            <tr><th>Affectation de frais</th><td>{{ $payment->fee_assignment_id ? ('#'.$payment->fee_assignment_id) : '—' }}</td></tr>
            <tr><th>Référence transaction</th><td>{{ $payment->transaction_reference ?? '—' }}</td></tr>
            <tr><th>Note</th><td class="word-break">{{ $payment->note ?? '—' }}</td></tr>
            </tbody>
        </table>

        <div class="footer">
            Document généré le {{ now()->format('d/m/Y à H:i') }} — {{ $school['name'] ?? 'École Paul Bert' }}
        </div>
    </div>
</body>
</html>
