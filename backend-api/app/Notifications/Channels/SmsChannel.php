<?php

namespace App\Notifications\Channels;

use App\Notifications\Messages\SmsMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Provider-agnostic SMS channel.
 *
 * It resolves the recipient phone number via the notifiable's
 * routeNotificationForSms() method, builds the message from the
 * notification's toSms() method, and POSTs a small JSON payload to the
 * endpoint configured in config/sms.php.
 *
 * When no provider URL is configured the message is written to the log so
 * that local and testing environments behave predictably without reaching an
 * external service. Failures throw so Laravel fires a NotificationFailed
 * event (captured by the logging listener into notification_logs).
 */
class SmsChannel
{
    public function send(mixed $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toSms')) {
            return;
        }

        $to = $notifiable->routeNotificationFor('sms', $notification);
        if (empty($to)) {
            return;
        }

        /** @var SmsMessage|string $message */
        $message = $notification->toSms($notifiable);
        if (is_string($message)) {
            $message = SmsMessage::create($message);
        }

        if (trim($message->content) === '') {
            return;
        }

        $from = $message->from ?: (string) config('sms.sender_name', 'Paul Bert');
        $url = config('sms.provider_url');

        // No provider configured → log only (dev/testing friendly).
        if (empty($url)) {
            Log::info('[sms] (no provider configured) to '.$to.' from '.$from.': '.$message->content);

            return;
        }

        $payload = [
            'to' => $to,
            'from' => $from,
            'message' => $message->content,
        ];

        $authMode = (string) config('sms.auth_mode', 'bearer');
        $apiKey = (string) config('sms.api_key', '');

        $request = Http::timeout((int) config('sms.timeout', 15))
            ->acceptJson()
            ->asJson();

        if ($apiKey !== '') {
            $request = match ($authMode) {
                'header' => $request->withHeaders(['X-API-Key' => $apiKey]),
                'body' => $request->withOptions([]),
                default => $request->withToken($apiKey),
            };
            if ($authMode === 'body') {
                $payload['api_key'] = $apiKey;
            }
        }

        $response = $request->post($url, $payload);

        if ($response->failed()) {
            throw new RuntimeException(
                'SMS provider responded with HTTP '.$response->status().': '.$response->body()
            );
        }
    }
}
