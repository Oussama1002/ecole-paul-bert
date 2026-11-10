<?php

namespace App\Notifications;

use App\Notifications\Messages\SmsMessage;
use Illuminate\Notifications\Messages\MailMessage;

class ReportCardAvailable extends SchoolNotification
{
    public function __construct(
        public string $studentName,
        public string $termName,
        public ?string $className = null,
        public ?int $studentId = null,
        public ?int $reportCardId = null,
    ) {}

    public function category(): string
    {
        return 'report_card';
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject("Bulletin disponible — {$this->studentName} — {$this->termName}")
            ->view('notifications.report_card', [
                'studentName' => $this->studentName,
                'termName' => $this->termName,
                'className' => $this->className,
                'subjectLine' => "Bulletin disponible — {$this->studentName}",
            ]);
    }

    public function toSms(object $notifiable): SmsMessage
    {
        return SmsMessage::create(
            "Ecole Paul Bert: Le bulletin de {$this->studentName} pour {$this->termName} est disponible."
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toInternal(object $notifiable): array
    {
        return [
            'type' => 'report_card.available',
            'title' => "Bulletin disponible — {$this->studentName}",
            'body' => "Le bulletin pour {$this->termName} est disponible.",
            'data' => [
                'student_id' => $this->studentId,
                'report_card_id' => $this->reportCardId,
            ],
        ];
    }
}
