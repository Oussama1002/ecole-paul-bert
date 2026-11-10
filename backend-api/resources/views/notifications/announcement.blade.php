@extends('notifications.layout')

@section('content')
    <h1>{{ $announcementTitle }}</h1>
    <p>Bonjour,</p>
    <p>L'École Paul Bert vous informe&nbsp;:</p>
    <div class="panel">
        <p style="margin:0; white-space: pre-line;">{{ $announcementContent }}</p>
    </div>
    <p>
        Vous pouvez consulter l'ensemble des annonces sur le portail de l'école.
    </p>
    <p>Cordialement,<br>L'équipe de l'École Paul Bert.</p>
@endsection
