<?php

namespace App\Notifications;

use App\Models\User;
use App\Notifications\Channels\InternalChannel;
use App\Notifications\Channels\SmsChannel;
use App\Notifications\Messages\SmsMessage;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * A diagnostic notification an admin sends to themselves to verify that email
 * and SMS delivery are configured correctly. Unlike regular notifications it
 * ignores stored preferences and attempts every channel the recipient can
 * physically receive, so the admin sees exactly what works.
 */
class TestNotification extends SchoolNotification
{
    public function category(): string
    {
        return 'general';
    }

    /**
     * Force all physically-available channels, bypassing preferences.
     *
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        $channels = [];
        if (! empty($notifiable->routeNotificationFor('mail', $this))) {
            $channels[] = 'mail';
        }
        if (! empty($notifiable->routeNotificationFor('sms', $this))) {
            $channels[] = SmsChannel::class;
        }
        if ($notifiable instanceof User) {
            $channels[] = InternalChannel::class;
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject('Test de configuration — École Paul Bert')
            ->view('notifications.announcement', [
                'announcementTitle' => 'Test de configuration des notifications',
                'announcementContent' => "Ceci est un e-mail de test envoyé depuis l'espace d'administration de l'École Paul Bert. Si vous recevez ce message, la configuration des e-mails fonctionne correctement.",
                'subjectLine' => 'Test de configuration',
            ]);
    }

    public function toSms(object $notifiable): SmsMessage
    {
        return SmsMessage::create(
            'Ecole Paul Bert: Test de configuration SMS. Si vous recevez ce message, la configuration fonctionne.'
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toInternal(object $notifiable): array
    {
        return [
            'type' => 'notification.test',
            'title' => 'Test de notification',
            'body' => 'Notification de test envoyée avec succès.',
            'data' => [],
        ];
    }
}
