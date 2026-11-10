<?php

namespace App\Notifications;

use App\Notifications\Messages\SmsMessage;
use Carbon\Carbon;
use Illuminate\Notifications\Messages\MailMessage;

class LateAlert extends SchoolNotification
{
    public function __construct(
        public string $studentName,
        public string $className,
        public string $date,
        public ?int $minutesLate = null,
        public ?int $studentId = null,
    ) {}

    public function category(): string
    {
        return 'late';
    }

    private function dateLabel(): string
    {
        return Carbon::parse($this->date)->format('d/m/Y');
    }

    public function toMail(object $notifiable): MailMessage
    {
        $dateLabel = $this->dateLabel();

        return (new MailMessage())
            ->subject("Retard de {$this->studentName} — {$dateLabel}")
            ->view('notifications.late', [
                'studentName' => $this->studentName,
                'className' => $this->className,
                'dateLabel' => $dateLabel,
                'minutesLate' => $this->minutesLate,
                'subjectLine' => "Retard de {$this->studentName}",
            ]);
    }

    public function toSms(object $notifiable): SmsMessage
    {
        $dateLabel = $this->dateLabel();

        return SmsMessage::create(
            "Ecole Paul Bert: Votre enfant {$this->studentName} ({$this->className}) a été marqué(e) en retard le {$dateLabel}. Merci de contacter l'école."
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toInternal(object $notifiable): array
    {
        $dateLabel = $this->dateLabel();

        return [
            'type' => 'late.alert',
            'title' => "Retard — {$this->studentName}",
            'body' => "{$this->studentName} ({$this->className}) a été marqué(e) en retard le {$dateLabel}.",
            'data' => [
                'student_id' => $this->studentId,
                'date' => $this->date,
                'minutes_late' => $this->minutesLate,
            ],
        ];
    }
}
