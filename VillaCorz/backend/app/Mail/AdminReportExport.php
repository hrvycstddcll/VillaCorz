<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminReportExport extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $report,
        public readonly string $frequency,
        public readonly string $csv,
        public readonly string $filename,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'VillaCorz '.ucfirst($this->report).' report');
    }

    public function content(): Content
    {
        return new Content(
            text: 'emails.admin-report-export',
            with: [
                'report' => $this->report,
                'frequency' => $this->frequency,
            ],
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->csv, $this->filename)
                ->withMime('text/csv'),
        ];
    }
}
