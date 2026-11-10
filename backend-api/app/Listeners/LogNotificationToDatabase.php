<?php

namespace App\Listeners;

use App\Models\NotificationLog;
use App\Notifications\Channels\InternalChannel;
use App\Notifications\Channels\SmsChannel;
use App\Notifications\SchoolNotification;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Log;

/**
 * Records every send attempt of a {@see SchoolNotification} into the
 * notification_logs table, driven by Laravel's NotificationSent /
 * NotificationFailed events (fired for each channel after delivery).
 */
class LogNotificationToDatabase
{
    public function handleSent(NotificationSent $event): void
    {
        $this->record($event->notification, $event->notifiable, $event->channel, 'sent', null);
    }

    public function handleFailed(NotificationFailed $event): void
    {
        $error = null;
        $data = $event->data ?? [];
        if (is_array($data)) {
            $error = $data['exception'] ?? null;
            if ($error instanceof \Throwable) {
                $error = $error->getMessage();
            }
        }

        $this->record($event->notification, $event->notifiable, $event->channel, 'failed', $error);
    }

    private function record(object $notification, mixed $notifiable, string $channel, string $status, ?string $error): void
    {
        if (! $notification instanceof SchoolNotification) {
            return;
        }

        $mapped = $this->mapChannel($channel);
        if ($mapped === null) {
            return;
        }

        $notifiableType = is_object($notifiable) ? get_class($notifiable) : null;
        $notifiableId = is_object($notifiable) && isset($notifiable->id) ? (int) $notifiable->id : null;
        if ($notifiableType === null || $notifiableId === null) {
            return;
        }

        try {
            NotificationLog::query()->create([
                'notifiable_type' => $notifiableType,
                'notifiable_id' => $notifiableId,
                'notification_type' => get_class($notification),
                'channel' => $mapped,
                'status' => $status,
                'error_message' => $error !== null ? mb_substr($error, 0, 2000) : null,
                'sent_at' => $status === 'sent' ? now() : null,
            ]);
        } catch (\Throwable $e) {
            Log::warning('notification_log.write_failed: '.$e->getMessage());
        }
    }

    private function mapChannel(string $channel): ?string
    {
        return match ($channel) {
            'mail' => 'email',
            SmsChannel::class, 'sms' => 'sms',
            InternalChannel::class, 'in_app' => 'in_app',
            default => null,
        };
    }
}
