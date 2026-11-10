@extends('notifications.layout')

@section('content')
    <h1>Confirmation de paiement</h1>
    <p>Chère famille, cher tuteur,</p>
    <p>
        Nous confirmons la bonne réception de votre paiement. Nous vous
        remercions de votre règlement.
    </p>
    <div class="panel">
        <table>
            <tr>
                <td class="label">Élève</td>
                <td class="value">{{ $studentName }}</td>
            </tr>
            <tr>
                <td class="label">Montant réglé</td>
                <td class="value">{{ $amountLabel }} FCFA</td>
            </tr>
            <tr>
                <td class="label">Date du paiement</td>
                <td class="value">{{ $dateLabel }}</td>
            </tr>
            @if (!empty($reference))
            <tr>
                <td class="label">Référence</td>
                <td class="value">{{ $reference }}</td>
            </tr>
            @endif
            <tr>
                <td class="label">Solde restant</td>
                <td class="value">{{ $balanceLabel }} FCFA</td>
            </tr>
        </table>
    </div>
    <p>
        Un reçu officiel est disponible auprès du secrétariat de l'école sur
        simple demande.
    </p>
    <p>Cordialement,<br>L'équipe de l'École Paul Bert.</p>
@endsection
