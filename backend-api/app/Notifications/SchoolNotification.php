<?php

namespace App\Notifications;

use App\Models\NotificationPreference;
use App\Models\User;
use App\Notifications\Channels\InternalChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Base class for all Ecole Paul Bert email/SMS/in-app notifications.
 *
 * Subclasses declare a {@see category()} (matching the notification_preferences
 * enum) and implement toMail() / toSms() / toInternal() as needed. The set of
 * channels actually used is computed from the recipient's stored preferences,
 * intersected with the channels the recipient can physically receive (email
 * address present, phone present, staff account for in-app).
 *
 * Delivery is queued so the triggering HTTP request never blocks on mail/SMS.
 */
abstract class SchoolNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /** @var array<string, string> preference channel => Laravel channel */
    protected const CHANNEL_MAP = [
        'email' => 'mail',
        'sms' => SmsChannel::class,
        'in_app' => InternalChannel::class,
    ];

    /**
     * The notification_preferences category this notification belongs to.
     */
    abstract public function category(): string;

    /**
     * Decide which channels to deliver on, based on the recipient's
     * preferences and what they can actually receive.
     *
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        $enabled = NotificationPreference::enabledChannelsFor($notifiable, $this->category());

        $channels = [];
        foreach ($enabled as $pref) {
            if (! $this->canReceive($notifiable, $pref)) {
                continue;
            }
            $laravelChannel = self::CHANNEL_MAP[$pref] ?? null;
            if ($laravelChannel !== null) {
                $channels[] = $laravelChannel;
            }
        }

        return array_values(array_unique($channels));
    }

    private function canReceive(object $notifiable, string $pref): bool
    {
        return match ($pref) {
            'email' => method_exists($this, 'toMail')
                && ! empty($notifiable->routeNotificationFor('mail', $this)),
            'sms' => method_exists($this, 'toSms')
                && ! empty($notifiable->routeNotificationFor('sms', $this)),
            'in_app' => method_exists($this, 'toInternal') && $notifiable instanceof User,
            default => false,
        };
    }
}
