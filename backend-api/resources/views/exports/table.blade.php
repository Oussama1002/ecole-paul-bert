<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 110px 28px 60px 28px;
        }
        * { font-family: DejaVu Sans, sans-serif; }
        body { margin: 0; color: #1f2937; font-size: 10px; }

        header {
            position: fixed;
            top: -90px;
            left: 0;
            right: 0;
            height: 80px;
        }
        .brand { display: table; width: 100%; }
        .brand .logo-cell { display: table-cell; width: 60px; vertical-align: middle; }
        .brand .logo-cell img { max-width: 52px; max-height: 52px; }
        .brand .text-cell { display: table-cell; vertical-align: middle; }
        .brand .school-name { font-size: 16px; font-weight: bold; color: #111827; }
        .brand .school-meta { font-size: 9px; color: #6b7280; }

        .doc-title { margin-top: 6px; }
        .doc-title .t { font-size: 13px; font-weight: bold; color: #2563eb; }
        .doc-title .d { font-size: 9px; color: #6b7280; }

        footer {
            position: fixed;
            bottom: -40px;
            left: 0;
            right: 0;
            height: 30px;
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
        }
        .pagenum:before { content: counter(page); }
        .pagecount:before { content: counter(pages); }

        table.data { width: 100%; border-collapse: collapse; margin-top: 4px; }
        table.data thead th {
            background-color: #2563eb;
            color: #ffffff;
            font-size: 9px;
            font-weight: bold;
            text-align: left;
            padding: 6px 6px;
            border: 1px solid #1e40af;
        }
        table.data tbody td {
            padding: 5px 6px;
            border: 1px solid #e5e7eb;
            font-size: 9px;
            vertical-align: top;
        }
        table.data tbody tr:nth-child(even) td { background-color: #f3f4f6; }
        .num { text-align: right; }
    </style>
</head>
<body>
    <header>
        <div class="brand">
            @if (!empty($school['logo_data']))
                <div class="logo-cell">
                    <img src="{{ $school['logo_data'] }}" alt="logo">
                </div>
            @endif
            <div class="text-cell">
                <div class="school-name">{{ $school['name'] ?: 'École Paul Bert' }}</div>
                @if (!empty($school['address']) || !empty($school['phone']) || !empty($school['email']))
                    <div class="school-meta">
                        {{ $school['address'] }}@if(!empty($school['phone'])) · Tél : {{ $school['phone'] }}@endif @if(!empty($school['email'])) · {{ $school['email'] }}@endif
                    </div>
                @endif
            </div>
        </div>
        <div class="doc-title">
            <span class="t">{{ $title }}</span>
            <span class="d">— Exporté le {{ $exportDate }}</span>
        </div>
    </header>

    <footer>
        {{ $school['name'] ?: 'École Paul Bert' }} — Page <span class="pagenum"></span> / <span class="pagecount"></span>
    </footer>

    <main>
        <table class="data">
            <thead>
                <tr>
                    @foreach ($columns as $col)
                        <th>{{ $col['label'] }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @forelse ($rows as $line)
                    <tr>
                        @foreach ($columns as $i => $col)
                            <td class="{{ in_array(($col['type'] ?? 'string'), ['number','currency']) ? 'num' : '' }}">{{ $line[$i] ?? '' }}</td>
                        @endforeach
                    </tr>
                @empty
                    <tr>
                        <td colspan="{{ count($columns) }}" style="text-align:center; color:#9ca3af; padding:16px;">
                            Aucune donnée à exporter.
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </main>
</body>
</html>
