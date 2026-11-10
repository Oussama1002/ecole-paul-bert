<?php

namespace App\Notifications;

use App\Notifications\Messages\SmsMessage;
use Carbon\Carbon;
use Illuminate\Notifications\Messages\MailMessage;

class PaymentReminder extends SchoolNotification
{
    public function __construct(
        public string $studentName,
        public float $amount,
        public string $dueDate,
        public ?string $feeLabel = null,
        public ?int $studentId = null,
    ) {}

    public function category(): string
    {
        return 'payment_reminder';
    }

    private function amountLabel(): string
    {
        return number_format($this->amount, 0, ',', ' ');
    }

    private function dueDateLabel(): string
    {
        return Carbon::parse($this->dueDate)->format('d/m/Y');
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject("Rappel de paiement — {$this->studentName}")
            ->view('notifications.payment_reminder', [
                'studentName' => $this->studentName,
                'amountLabel' => $this->amountLabel(),
                'dueDateLabel' => $this->dueDateLabel(),
                'feeLabel' => $this->feeLabel,
                'subjectLine' => "Rappel de paiement — {$this->studentName}",
            ]);
    }

    public function toSms(object $notifiable): SmsMessage
    {
        $amountLabel = $this->amountLabel();
        $dueDateLabel = $this->dueDateLabel();

        return SmsMessage::create(
            "Ecole Paul Bert: Rappel — Facture de {$amountLabel} FCFA pour {$this->studentName}, échéance le {$dueDateLabel}. Merci de régulariser."
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toInternal(object $notifiable): array
    {
        return [
            'type' => 'payment.reminder',
            'title' => "Rappel de paiement — {$this->studentName}",
            'body' => "Facture de {$this->amountLabel()} FCFA, échéance le {$this->dueDateLabel()}.",
            'data' => [
                'student_id' => $this->studentId,
                'amount' => $this->amount,
                'due_date' => $this->dueDate,
            ],
        ];
    }
}
