@extends('notifications.layout')

@section('content')
    <h1>Rappel de paiement</h1>
    <p>Chère famille, cher tuteur,</p>
    <p>
        Nous vous rappelons qu'une facture reste à régler concernant la
        scolarité de votre enfant.
    </p>
    <div class="panel">
        <table>
            <tr>
                <td class="label">Élève</td>
                <td class="value">{{ $studentName }}</td>
            </tr>
            <tr>
                <td class="label">Montant dû</td>
                <td class="value">{{ $amountLabel }} FCFA</td>
            </tr>
            <tr>
                <td class="label">Échéance</td>
                <td class="value">{{ $dueDateLabel }}</td>
            </tr>
            @if (!empty($feeLabel))
            <tr>
                <td class="label">Objet</td>
                <td class="value">{{ $feeLabel }}</td>
            </tr>
            @endif
        </table>
    </div>
    <p>
        Nous vous remercions de bien vouloir procéder au règlement avant la date
        d'échéance, auprès du secrétariat de l'école ou selon les modalités
        habituelles de paiement.
    </p>
    <p>
        Si le règlement a déjà été effectué, merci de ne pas tenir compte de ce
        message.
    </p>
    <p>Cordialement,<br>L'équipe de l'École Paul Bert.</p>
@endsection
