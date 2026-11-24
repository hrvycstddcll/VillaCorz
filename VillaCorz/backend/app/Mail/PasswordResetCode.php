<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetCode extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $firstname,
        public readonly string $code,
        public readonly string $resetId,
        public readonly string $email,
    ) {
        $this->resetUrl = rtrim(config('app.frontend_url'), '/')
            .'/forgot-password?reset_id='.urlencode($resetId)
            .'&email='.urlencode($email);
    }

    public readonly string $resetUrl;

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'VillaCorz password reset code');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.password-reset-code');
    }
}
