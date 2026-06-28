<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Rapport synthèse finance</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; margin: 0; }
        .page { padding: 24px 28px; }
        .muted { color: #6b7280; }
        h1 { font-size: 18px; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { padding: 8px; border: 1px solid #e5e7eb; }
        th { background: #f9fafb; text-align: left; }
        .header { display: table; width: 100%; margin-bottom: 10px; }
        .header .logo { display: table-cell; vertical-align: middle; width: 72px; }
        .header .logo img { max-width: 64px; max-height: 64px; }
        .header .brand { display: table-cell; vertical-align: middle; }
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
    @endphp
    <div class="page">
    <div class="header">
        @if($logoAbsolute)
            <div class="logo"><img src="file://{{ $logoAbsolute }}" alt="logo"></div>
        @endif
        <div class="brand">
            <h1>Rapport synthèse finance</h1>
            <div class="muted">
                <b>{{ $school['name'] ?? 'Établissement' }}</b>
                @if(!empty($school['city'])) — {{ $school['city'] }} @endif
            </div>
        </div>
    </div>
    <div class="muted">
        <div>Généré le {{ $generated_at }}</div>
        @if($school_year_id)<div>Année scolaire ID : {{ $school_year_id }}</div>@endif
        @if($from || $to)<div>Période : {{ $from ? \Carbon\Carbon::parse($from)->format('d/m/Y') : '…' }} → {{ $to ? \Carbon\Carbon::parse($to)->format('d/m/Y') : '…' }}</div>@endif
    </div>
    <table>
        <tbody>
        <tr><th>Recettes (paiements confirmés)</th><td>{{ number_format($revenue, 2, ',', ' ') }} MAD</td></tr>
        <tr><th>Dépenses (actives)</th><td>{{ number_format($expenses, 2, ',', ' ') }} MAD</td></tr>
        <tr><th>Solde net</th><td><b>{{ number_format($net, 2, ',', ' ') }} MAD</b></td></tr>
        <tr><th>Encours factures (hors annulées)</th><td>{{ number_format($unpaid, 2, ',', ' ') }} MAD</td></tr>
        </tbody>
    </table>
    </div>
</body>
</html>
