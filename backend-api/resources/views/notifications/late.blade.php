@extends('notifications.layout')

@section('content')
    <h1>Retard signalé</h1>
    <p>Chère famille, cher tuteur,</p>
    <p>
        Nous vous informons que votre enfant a été marqué(e) en
        <strong>retard</strong> aujourd'hui.
    </p>
    <div class="panel">
        <table>
            <tr>
                <td class="label">Élève</td>
                <td class="value">{{ $studentName }}</td>
            </tr>
            <tr>
                <td class="label">Classe</td>
                <td class="value">{{ $className }}</td>
            </tr>
            <tr>
                <td class="label">Date</td>
                <td class="value">{{ $dateLabel }}</td>
            </tr>
            @if (!empty($minutesLate))
            <tr>
                <td class="label">Minutes de retard</td>
                <td class="value">{{ $minutesLate }} min</td>
            </tr>
            @endif
        </table>
    </div>
    <p>
        Nous vous remercions de veiller à la ponctualité de votre enfant. Pour
        toute justification, veuillez contacter le secrétariat de l'école.
    </p>
    <p>Cordialement,<br>L'équipe de l'École Paul Bert.</p>
@endsection
