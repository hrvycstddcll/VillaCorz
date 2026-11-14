<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class CancellationRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Booking $booking,
        public readonly string $reason,
        public readonly ?string $proofPath = null,
        public readonly ?string $proofOriginalName = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: [$this->booking->contact_email],
            subject: "VillaCorz emergency cancellation request — {$this->booking->reference}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.cancellation-request',
        );
    }

    public function attachments(): array
    {
        if ($this->proofPath === null || $this->proofPath === '') {
            return [];
        }

        return [
            Attachment::fromStorageDisk('local', $this->proofPath)
                ->as($this->proofOriginalName ?: basename($this->proofPath)),
        ];
    }
}
