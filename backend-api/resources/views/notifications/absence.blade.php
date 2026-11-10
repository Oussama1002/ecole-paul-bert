@extends('notifications.layout')

@section('content')
    <h1>Absence signalée</h1>
    <p>Chère famille, cher tuteur,</p>
    <p>
        Nous vous informons que votre enfant a été marqué(e)
        <strong>absent(e)</strong> aujourd'hui.
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
        </table>
    </div>
    <p>
        Si cette absence est justifiée, nous vous remercions de bien vouloir
        contacter le secrétariat de l'école afin de régulariser la situation.
    </p>
    <p>Cordialement,<br>L'équipe de l'École Paul Bert.</p>
@endsection
