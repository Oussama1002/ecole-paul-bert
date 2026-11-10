<?php

namespace App\Notifications;

use App\Notifications\Messages\SmsMessage;
use Carbon\Carbon;
use Illuminate\Notifications\Messages\MailMessage;

class PaymentReceived extends SchoolNotification
{
    public function __construct(
        public string $studentName,
        public float $amount,
        public string $date,
        public float $remainingBalance = 0.0,
        public ?string $reference = null,
        public ?int $studentId = null,
    ) {}

    public function category(): string
    {
        return 'payment_received';
    }

    private function amountLabel(): string
    {
        return number_format($this->amount, 0, ',', ' ');
    }

    private function balanceLabel(): string
    {
        return number_format(max(0.0, $this->remainingBalance), 0, ',', ' ');
    }

    private function dateLabel(): string
    {
        return Carbon::parse($this->date)->format('d/m/Y');
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject("Confirmation de paiement — {$this->studentName}")
            ->view('notifications.payment_received', [
                'studentName' => $this->studentName,
                'amountLabel' => $this->amountLabel(),
                'dateLabel' => $this->dateLabel(),
                'balanceLabel' => $this->balanceLabel(),
                'reference' => $this->reference,
                'subjectLine' => "Confirmation de paiement — {$this->studentName}",
            ]);
    }

    public function toSms(object $notifiable): SmsMessage
    {
        $amountLabel = $this->amountLabel();

        return SmsMessage::create(
            "Ecole Paul Bert: Paiement de {$amountLabel} FCFA reçu pour {$this->studentName}. Merci."
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toInternal(object $notifiable): array
    {
        return [
            'type' => 'payment.received',
            'title' => "Paiement reçu — {$this->studentName}",
            'body' => "Paiement de {$this->amountLabel()} FCFA reçu le {$this->dateLabel()}.",
            'data' => [
                'student_id' => $this->studentId,
                'amount' => $this->amount,
                'date' => $this->date,
                'remaining_balance' => $this->remainingBalance,
            ],
        ];
    }
}
