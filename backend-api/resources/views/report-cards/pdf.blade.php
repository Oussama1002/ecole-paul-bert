<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>{{ $template['title'] ?? 'Bulletin' }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; margin: 0; }
        .page { padding: 24px 28px; }
        .muted { color: #6b7280; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        h2 { font-size: 13px; margin: 18px 0 6px; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
        th { text-align: left; background: #f9fafb; font-weight: 600; }
        .header { display: table; width: 100%; margin-bottom: 8px; }
        .header .logo { display: table-cell; vertical-align: middle; width: 72px; }
        .header .logo img { max-width: 64px; max-height: 64px; }
        .header .brand { display: table-cell; vertical-align: middle; }
        .kpi-row { margin: 4px 0 0; }
        .kpi { display: inline-block; margin-right: 18px; padding-right: 18px; border-right: 1px solid #e5e7eb; }
        .kpi:last-child { border-right: 0; }
        .kpi b { font-size: 14px; }
        .info-grid { width: 100%; }
        .info-grid td { border: 0; padding: 4px 8px 4px 0; }
        .info-grid td.label { color: #6b7280; width: 35%; }
        .block-text { white-space: pre-line; }
        .sign { margin-top: 28px; display: table; width: 100%; }
        .sign .cell { display: table-cell; width: 50%; padding-top: 20px; border-top: 1px dashed #9ca3af; text-align: center; color: #374151; }
        .footer { margin-top: 26px; font-size: 10.5px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 6px; }
        .word-break { word-break: break-word; overflow-wrap: anywhere; }
    </style>
</head>
<body>
<div class="page">
    @php
        $sections = collect($template['sections'] ?? [])->where('enabled', true)->values();
        $school = $template['school'] ?? [];
        $title = $template['title'] ?? 'Bulletin';
        $simpleOptions = is_array($template['simple_options'] ?? null) ? $template['simple_options'] : [];
        $showAttendance = (bool) ($simpleOptions['show_attendance'] ?? true);
        $showRanking = (bool) ($simpleOptions['show_ranking'] ?? true);
        $principalComment = trim((string) ($simpleOptions['principal_comment'] ?? ''));
        $teacherComment = trim((string) ($simpleOptions['teacher_comment'] ?? ''));

        $fieldsOf = function (array $section) {
            return collect($section['fields'] ?? [])->where('enabled', true)->values();
        };
        $columnsOf = function (array $section) {
            return collect($section['columns'] ?? [])->where('enabled', true)->values();
        };
    @endphp

    @foreach($sections as $section)
        @switch($section['key'])

            {{-- ===== HEADER ===== --}}
            @case('header')
                <div class="header">
                    @php
                        $logoAbsolute = null;
                        if (! empty($school['logo_path'])) {
                            $candidate = storage_path('app/'.$school['logo_path']);
                            if (is_file($candidate)) {
                                $logoAbsolute = $candidate;
                            }
                        }
                    @endphp
                    @if($logoAbsolute)
                        <div class="logo">
                            <img src="file://{{ $logoAbsolute }}" alt="logo">
                        </div>
                    @endif
                    <div class="brand">
                        <h1>{{ $title }}</h1>
                        <div class="muted">
                            <b>{{ $school['name'] ?? '' }}</b>
                            @if(!empty($school['address'])) — {{ $school['address'] }} @endif
                            @if(!empty($school['city'])) — {{ $school['city'] }} @endif
                            @if(!empty($school['phone']))<br>Tél. {{ $school['phone'] }}@endif
                            @if(!empty($school['email']))<br>{{ $school['email'] }}@endif
                        </div>
                    </div>
                </div>
                @break

            {{-- ===== STUDENT INFO ===== --}}
            @case('student_info')
                @php $fields = $fieldsOf($section); @endphp
                @if($fields->isNotEmpty())
                    <h2>{{ $section['label'] }}</h2>
                    <table class="info-grid">
                        @foreach($fields as $f)
                            <tr>
                                <td class="label">{{ $f['label'] }}</td>
                                <td>
                                    @switch($f['key'])
                                        @case('student_name')
                                            <span class="word-break">{{ trim((string) (($student?->last_name ?? '').' '.($student?->first_name ?? ''))) ?: '—' }}</span>
                                            @break
                                        @case('student_code')
                                            {{ $student?->student_code ?: '—' }}
                                            @break
                                        @case('class')
                                            <span class="word-break">{{ $class?->name ?: '—' }}</span>
                                            @break
                                        @case('period')
                                            <span class="word-break">{{ $period?->name ?: '—' }}</span>
                                            @if($period?->start_date && $period?->end_date)
                                                ({{ $period->start_date->format('d/m/Y') }} → {{ $period->end_date->format('d/m/Y') }})
                                            @endif
                                            @break
                                        @case('date_of_birth')
                                            {{ $student?->date_of_birth?->format('d/m/Y') ?? '—' }}
                                            @break
                                    @endswitch
                                </td>
                            </tr>
                        @endforeach
                    </table>
                @endif
                @break

            {{-- ===== KPIS ===== --}}
            @case('kpis')
                @php $fields = $fieldsOf($section); @endphp
                @if($fields->isNotEmpty())
                    <h2>{{ $section['label'] }}</h2>
                    <div class="kpi-row">
                        @foreach($fields as $f)
                            @php
                                if ($f['key'] === 'rank' && ! $showRanking) {
                                    continue;
                                }
                                if (in_array($f['key'], ['absent_count', 'late_count'], true) && ! $showAttendance) {
                                    continue;
                                }
                            @endphp
                            <span class="kpi">
                                <span class="muted">{{ $f['label'] }}</span><br>
                                <b>
                                    @switch($f['key'])
                                        @case('period_average') {{ $reportCard->period_average ?? '—' }} @break
                                        @case('rank') {{ $reportCard->rank ? ($reportCard->rank.' / '.$reportCard->rank_out_of) : '—' }} @break
                                        @case('absent_count') {{ $reportCard->absent_count }} @break
                                        @case('late_count') {{ $reportCard->late_count }} @break
                                    @endswitch
                                </b>
                            </span>
                        @endforeach
                    </div>
                @endif
                @break

            {{-- ===== SUBJECTS TABLE ===== --}}
            @case('subjects_table')
                @php $cols = $columnsOf($section); @endphp
                @if($cols->isNotEmpty())
                    <h2>{{ $section['label'] }}</h2>
                    <table>
                        <thead>
                            <tr>
                                @foreach($cols as $c)
                                    <th>{{ $c['label'] }}</th>
                                @endforeach
                            </tr>
                        </thead>
                        <tbody>
                            @php($sa = $reportCard->subject_averages ?? [])
                            @if(empty($sa))
                                <tr>
                                    <td colspan="{{ $cols->count() }}" class="muted">Aucune note.</td>
                                </tr>
                            @else
                                @foreach($sa as $subjectId => $avg)
                                    <tr>
                                        @foreach($cols as $c)
                                            <td>
                                                @switch($c['key'])
                                                    @case('subject')
                                                        <span class="word-break">{{ $subjectNames[$subjectId] ?? 'Non défini' }}</span>
                                                        @break
                                                    @case('average')
                                                        {{ $avg }}
                                                        @break
                                                    @case('appreciation')
                                                        {{-- Placeholder for future per-subject text --}}
                                                        —
                                                        @break
                                                @endswitch
                                            </td>
                                        @endforeach
                                    </tr>
                                @endforeach
                            @endif
                        </tbody>
                    </table>
                @endif
                @break

            {{-- ===== FREE-TEXT APPRECIATION ===== --}}
            @case('appreciation')
                <h2>{{ $section['label'] }}</h2>
                <div class="block-text">{{ $section['text'] ?: '—' }}</div>
                @break

            {{-- ===== SIGNATURE ===== --}}
            @case('signature')
                <div class="sign">
                    <div class="cell">{{ $section['label'] }} — {{ $section['text'] }}</div>
                    <div class="cell">Cachet / Date</div>
                </div>
                @break

            {{-- ===== FOOTER ===== --}}
            @case('footer')
                <div class="footer">
                    {{ $section['text'] ?: '—' }}
                    @if($reportCard->generated_at)
                        — Généré le {{ $reportCard->generated_at->format('d/m/Y H:i') }}
                    @endif
                    — Statut: {{ $reportCard->status }}
                </div>
                @break

        @endswitch
    @endforeach

    @if($teacherComment !== '' || $principalComment !== '')
        <h2>Commentaires</h2>
        <table class="info-grid">
            @if($teacherComment !== '')
                <tr>
                    <td class="label">Commentaire enseignant</td>
                    <td class="block-text">{{ $teacherComment }}</td>
                </tr>
            @endif
            @if($principalComment !== '')
                <tr>
                    <td class="label">Commentaire direction</td>
                    <td class="block-text">{{ $principalComment }}</td>
                </tr>
            @endif
        </table>
    @endif
</div>
</body>
</html>
