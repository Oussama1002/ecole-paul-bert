<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Bilan financier</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #243447; background: #fcfcfd; }
        .head { margin-bottom: 16px; }
        .head-table { width: 100%; border: none; margin-bottom: 8px; }
        .head-table td { border: none; vertical-align: top; }
        .logo { max-height: 64px; max-width: 120px; border-radius: 8px; }
        .title-wrap {
            background: linear-gradient(135deg, #1f7a8c 0%, #67b99a 100%);
            color: #ffffff;
            padding: 12px 14px;
            border-radius: 10px;
        }
        .muted { color: #d7eef2; }
        .title { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
        .section-title {
            margin-top: 14px;
            margin-bottom: 8px;
            padding: 7px 10px;
            font-size: 13px;
            font-weight: bold;
            color: #0f4c5c;
            background: #e6f4f1;
            border-left: 5px solid #2a9d8f;
            border-radius: 6px;
        }
        .kpis { width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 14px; }
        .kpis td { border: 1px solid #dce9eb; padding: 10px; width: 33%; vertical-align: top; border-radius: 8px; background: #ffffff; }
        .kpis .value { font-size: 15px; font-weight: bold; margin-top: 4px; color: #0f4c5c; }
        .kpis .ok { color: #1b8a5a; }
        .kpis .warn { color: #b56a00; }
        .kpis .bad { color: #b42318; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; background: #ffffff; }
        th, td { border: 1px solid #dce3ea; padding: 7px 8px; text-align: left; }
        th { background: #edf5fb; color: #1f4e79; font-weight: bold; }
        tr:nth-child(even) td { background: #f9fcff; }
        .right { text-align: right; }
        .month-label {
            margin-top: 10px;
            margin-bottom: 6px;
            font-weight: bold;
            color: #2a6f97;
        }
        .footer-balance {
            margin-top: 12px;
            padding: 10px 12px;
            border-radius: 8px;
            background: #e8f7ee;
            border: 1px solid #bee3cf;
            font-size: 13px;
            color: #14532d;
        }
    </style>
</head>
<body>
    <div class="head">
        <table class="head-table">
            <tr>
                <td style="width: 130px;">
                    @if (!empty($school['logo']))
                        <img src="{{ $school['logo'] }}" alt="Logo" class="logo">
                    @endif
                </td>
                <td>
                    <div class="title-wrap">
                        <div class="title">{{ $school['name'] ?? 'École Paul Bert' }} — Bilan financier</div>
                        <div class="muted">Période: {{ $bilan['period']['label'] }}</div>
                        <div class="muted">Généré le {{ $generated_at }}</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <table class="kpis">
        <tr>
            <td><strong>Revenus totaux</strong><div class="value ok">{{ number_format($bilan['summary']['total_income'], 2, ',', ' ') }}</div></td>
            <td><strong>Dépenses totales</strong><div class="value bad">{{ number_format($bilan['summary']['total_expenses'], 2, ',', ' ') }}</div></td>
            <td><strong>Solde net</strong><div class="value {{ $bilan['summary']['net_balance'] >= 0 ? 'ok' : 'bad' }}">{{ number_format($bilan['summary']['net_balance'], 2, ',', ' ') }}</div></td>
        </tr>
        <tr>
            <td><strong>Impayés</strong><div class="value warn">{{ number_format($bilan['summary']['unpaid_invoices_total'], 2, ',', ' ') }}</div></td>
            <td><strong>Paiements partiels</strong><div class="value warn">{{ number_format($bilan['summary']['partial_payments_total'], 2, ',', ' ') }}</div></td>
            <td><strong>Nouvelles inscriptions</strong><div class="value">{{ $bilan['summary']['new_registrations_count'] }}</div></td>
        </tr>
    </table>

    <div class="section-title">Revenus par catégorie</div>
    <table>
        <thead><tr><th>Catégorie</th><th class="right">Montant</th><th class="right">Entrées</th></tr></thead>
        <tbody>
        @foreach ($bilan['income_breakdown'] as $row)
            <tr>
                <td>{{ $row['label'] }}</td>
                <td class="right">{{ number_format($row['total_amount'], 2, ',', ' ') }}</td>
                <td class="right">{{ $row['entries_count'] }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <div class="section-title">Dépenses par catégorie</div>
    <table>
        <thead><tr><th>Type</th><th>Catégorie</th><th class="right">Montant</th><th class="right">Entrées</th></tr></thead>
        <tbody>
        @foreach ($bilan['expense_breakdown'] as $row)
            <tr>
                <td>{{ $row['cost_group'] === 'fixed' ? 'Fixes' : 'Variables' }}</td>
                <td>{{ $row['label'] }}</td>
                <td class="right">{{ number_format($row['total_amount'], 2, ',', ' ') }}</td>
                <td class="right">{{ $row['entries_count'] }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <div class="section-title">Tableau des revenus (mensuel)</div>
    <table>
        <thead><tr><th>Mois</th><th class="right">Revenus</th></tr></thead>
        <tbody>
        @foreach ($bilan['monthly_evolution'] as $row)
            <tr>
                <td>{{ $row['month_label'] }}</td>
                <td class="right">{{ number_format($row['income'], 2, ',', ' ') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <div class="section-title">Détail mensuel par catégorie</div>
    @foreach ($bilan['monthly_category_breakdown'] as $monthBlock)
        <div class="month-label">{{ $monthBlock['month_label'] }}</div>
        <table>
            <thead>
                <tr>
                    <th>Catégorie</th>
                    <th class="right">Revenus</th>
                    <th class="right">Dépenses</th>
                    <th class="right">Net</th>
                </tr>
            </thead>
            <tbody>
            @forelse ($monthBlock['rows'] as $row)
                <tr>
                    <td>{{ $row['category'] }}</td>
                    <td class="right">{{ number_format($row['income'], 2, ',', ' ') }}</td>
                    <td class="right">{{ number_format($row['expenses'], 2, ',', ' ') }}</td>
                    <td class="right">{{ number_format($row['net_balance'], 2, ',', ' ') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="4">Aucune donnée pour ce mois.</td>
                </tr>
            @endforelse
            </tbody>
        </table>
    @endforeach

    <div class="footer-balance"><strong>Solde final net:</strong> {{ number_format($bilan['summary']['net_balance'], 2, ',', ' ') }}</div>
</body>
</html>
