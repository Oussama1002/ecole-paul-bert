<?php

namespace App\Notifications;

use App\Notifications\Messages\SmsMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Str;

class AnnouncementBroadcast extends SchoolNotification
{
    public function __construct(
        public string $title,
        public string $content,
        public ?int $announcementId = null,
    ) {}

    public function category(): string
    {
        return 'announcement';
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject("Annonce — {$this->title}")
            ->view('notifications.announcement', [
                'announcementTitle' => $this->title,
                'announcementContent' => $this->content,
                'subjectLine' => "Annonce — {$this->title}",
            ]);
    }

    public function toSms(object $notifiable): SmsMessage
    {
        $truncated = Str::limit(trim(preg_replace('/\s+/', ' ', $this->content) ?? ''), 80);

        return SmsMessage::create(
            "Ecole Paul Bert: {$this->title} — {$truncated} Consultez le portail pour plus de détails."
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toInternal(object $notifiable): array
    {
        return [
            'type' => 'announcement.published',
            'title' => "Annonce : {$this->title}",
            'body' => Str::limit(trim(preg_replace('/\s+/', ' ', $this->content) ?? ''), 160),
            'data' => [
                'announcement_id' => $this->announcementId,
            ],
        ];
    }
}
