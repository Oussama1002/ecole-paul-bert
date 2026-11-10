@extends('notifications.layout')

@section('content')
    <h1>Bulletin disponible</h1>
    <p>Chère famille, cher tuteur,</p>
    <p>
        Le bulletin scolaire de votre enfant est désormais disponible.
    </p>
    <div class="panel">
        <table>
            <tr>
                <td class="label">Élève</td>
                <td class="value">{{ $studentName }}</td>
            </tr>
            <tr>
                <td class="label">Période</td>
                <td class="value">{{ $termName }}</td>
            </tr>
            @if (!empty($className))
            <tr>
                <td class="label">Classe</td>
                <td class="value">{{ $className }}</td>
            </tr>
            @endif
        </table>
    </div>
    <p>
        Vous pouvez retirer le bulletin auprès du secrétariat de l'école ou le
        consulter selon les modalités communiquées par l'établissement.
    </p>
    <p>Cordialement,<br>L'équipe de l'École Paul Bert.</p>
@endsection
