<?php

namespace App\Mail;

use App\Models\Booking;
use App\Models\CancellationProof;
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

    private ?string $temporaryProofPath = null;

    public function __construct(
        public readonly Booking $booking,
        public readonly string $reason,
        public readonly ?string $proofPath = null,
        public readonly ?string $proofOriginalName = null,
        public readonly ?CancellationProof $proof = null,
    ) {}

    public function __destruct()
    {
        $this->cleanupProofFile();
    }

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
        $proof = $this->resolveProof();

        if ($proof === null) {
            if ($this->proofPath === null || $this->proofPath === '') {
                return [];
            }

            if (! Storage::disk('local')->exists($this->proofPath)) {
                return [];
            }

            return [
                Attachment::fromStorageDisk('local', $this->proofPath)
                    ->as($this->proofOriginalName ?: basename($this->proofPath)),
            ];
        }

        $this->temporaryProofPath ??= $proof->writeTemporaryFile();

        return [
            Attachment::fromPath($this->temporaryProofPath)
                ->as($this->proofOriginalName ?: $proof->original_name ?: basename($proof->path))
                ->withMime($proof->mime ?: 'application/octet-stream'),
        ];
    }

    public function send($mailer)
    {
        try {
            return parent::send($mailer);
        } finally {
            $this->cleanupProofFile();
        }
    }

    public function cleanupProofFile(): void
    {
        if ($this->temporaryProofPath !== null && is_file($this->temporaryProofPath)) {
            @unlink($this->temporaryProofPath);
        }

        $this->temporaryProofPath = null;
    }

    private function resolveProof(): ?CancellationProof
    {
        if ($this->proof !== null) {
            return $this->proof;
        }

        if ($this->proofPath === null || $this->proofPath === '') {
            return null;
        }

        return CancellationProof::query()
            ->where('path', $this->proofPath)
            ->first();
    }
}
