<?php

namespace App\Notifications;

use App\Notifications\Messages\SmsMessage;
use Carbon\Carbon;
use Illuminate\Notifications\Messages\MailMessage;

class AbsenceAlert extends SchoolNotification
{
    public function __construct(
        public string $studentName,
        public string $className,
        public string $date,
        public ?int $studentId = null,
    ) {}

    public function category(): string
    {
        return 'absence';
    }

    private function dateLabel(): string
    {
        return Carbon::parse($this->date)->format('d/m/Y');
    }

    public function toMail(object $notifiable): MailMessage
    {
        $dateLabel = $this->dateLabel();

        return (new MailMessage())
            ->subject("Absence de {$this->studentName} — {$dateLabel}")
            ->view('notifications.absence', [
                'studentName' => $this->studentName,
                'className' => $this->className,
                'dateLabel' => $dateLabel,
                'subjectLine' => "Absence de {$this->studentName}",
            ]);
    }

    public function toSms(object $notifiable): SmsMessage
    {
        $dateLabel = $this->dateLabel();

        return SmsMessage::create(
            "Ecole Paul Bert: Votre enfant {$this->studentName} ({$this->className}) a été marqué(e) absent(e) le {$dateLabel}. Merci de contacter l'école."
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toInternal(object $notifiable): array
    {
        $dateLabel = $this->dateLabel();

        return [
            'type' => 'absence.alert',
            'title' => "Absence — {$this->studentName}",
            'body' => "{$this->studentName} ({$this->className}) a été marqué(e) absent(e) le {$dateLabel}.",
            'data' => [
                'student_id' => $this->studentId,
                'date' => $this->date,
            ],
        ];
    }
}
