<?php

namespace App\Notifications\Messages;

/**
 * A single SMS payload produced by a notification's toSms() method and
 * delivered through {@see \App\Notifications\Channels\SmsChannel}.
 */
class SmsMessage
{
    public string $content = '';

    public ?string $from = null;

    public static function create(string $content = ''): self
    {
        return (new self())->content($content);
    }

    public function content(string $content): self
    {
        $this->content = $content;

        return $this;
    }

    /** Override the default sender name for this message. */
    public function from(?string $from): self
    {
        $this->from = $from;

        return $this;
    }
}
