<?php

namespace Tests\Feature;

use App\Mail\CancellationRequestMail;
use App\Models\Booking;
use App\Models\CancellationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Tests\UsesSqliteInMemory;

class CancellationProofTest extends TestCase
{
    use RefreshDatabase;
    use UsesSqliteInMemory;

    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.cancel_request.recipient', 'admin@example.com');
        Mail::fake();
    }

    public function test_cancellation_proof_is_persisted_in_the_database_and_attached_to_the_mail(): void
    {
        $owner = User::factory()->create();
        $booking = $this->makeConfirmedBooking($owner);

        Storage::fake('local');

        $file = UploadedFile::fake()->createWithContent(
            'proof.png',
            base64_decode(self::PNG),
        );
        $bytes = file_get_contents($file->getRealPath());

        $this->actingAs($owner)
            ->post("/api/bookings/{$booking->reference}/cancel-request", [
                'reason' => 'Emergency cancellation.',
                'proof' => $file,
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $cancelRequest = CancellationRequest::query()
            ->where('booking_id', $booking->id)
            ->firstOrFail();
        $proof = $cancelRequest->proof;

        $this->assertNotNull($proof);
        $this->assertSame('proof.png', $proof->original_name);
        $this->assertSame('image/png', $proof->mime);
        $this->assertSame(strlen($bytes), $proof->size);
        $this->assertSame($bytes, $proof->contents);
        $this->assertStringStartsWith("cancel-requests/{$booking->reference}/", $proof->path);
        $this->assertSame($proof->path, $cancelRequest->proof_path);
        $this->assertSame([], Storage::disk('local')->allFiles());

        $sentMail = null;

        Mail::assertSent(CancellationRequestMail::class, function (CancellationRequestMail $mail) use (&$sentMail): bool {
            $sentMail = $mail;

            return true;
        });

        $this->assertNotNull($sentMail);
        $attachments = $sentMail->attachments();
        $this->assertCount(1, $attachments);
        $this->assertSame('proof.png', $attachments[0]->as);
        $this->assertSame('image/png', $attachments[0]->mime);

        $temporaryPath = $attachments[0]->attachWith(
            fn (string $path): string => $path,
            fn (): null => null,
        );

        $this->assertFileExists($temporaryPath);
        $this->assertSame($bytes, file_get_contents($temporaryPath));

        $sentMail->cleanupProofFile();

        $this->assertFileDoesNotExist($temporaryPath);
    }

    public function test_mail_resolves_database_proof_from_the_compatible_path_reference(): void
    {
        $owner = User::factory()->create();
        $booking = $this->makeConfirmedBooking($owner);

        $cancelRequest = $booking->cancellationRequests()->create([
            'user_id' => $owner->id,
            'reason' => 'Emergency cancellation.',
            'status' => 'pending',
        ]);

        $proof = $cancelRequest->proof()->create([
            'path' => "cancel-requests/{$booking->reference}/proof.png",
            'original_name' => 'proof.png',
            'mime' => 'application/pdf',
            'size' => 8,
            'contents' => 'proof-01',
        ]);

        $mail = new CancellationRequestMail(
            booking: $booking,
            reason: 'Emergency cancellation.',
            proofPath: $proof->path,
            proofOriginalName: 'renamed.pdf',
        );

        $attachments = $mail->attachments();
        $this->assertCount(1, $attachments);
        $this->assertSame('renamed.pdf', $attachments[0]->as);
        $this->assertSame('application/pdf', $attachments[0]->mime);

        $temporaryPath = $attachments[0]->attachWith(
            fn (string $path): string => $path,
            fn (): null => null,
        );

        $this->assertSame('proof-01', file_get_contents($temporaryPath));

        $mail->cleanupProofFile();

        $this->assertFileDoesNotExist($temporaryPath);
    }

    public function test_cancellation_request_without_proof_does_not_store_or_attach_a_proof(): void
    {
        $owner = User::factory()->create();
        $booking = $this->makeConfirmedBooking($owner);

        $this->actingAs($owner)
            ->post("/api/bookings/{$booking->reference}/cancel-request", [
                'reason' => 'Emergency cancellation.',
            ])
            ->assertOk();

        $this->assertDatabaseCount('cancellation_proofs', 0);

        Mail::assertSent(CancellationRequestMail::class, function (CancellationRequestMail $mail): bool {
            return $mail->attachments() === [];
        });
    }

    private function makeConfirmedBooking(User $owner): Booking
    {
        return Booking::create([
            'user_id' => $owner->id,
            'reference' => 'VC-PROOF-'.strtoupper(uniqid()),
            'contact_name' => 'Proof Guest',
            'contact_email' => $owner->email,
            'check_in' => now()->addDays(3),
            'check_out' => now()->addDays(5),
            'nights' => 2,
            'paid_days' => 2,
            'adults' => 1,
            'kids' => 0,
            'subtotal' => 3000,
            'total' => 3000,
            'currency' => 'PHP',
            'status' => 'confirmed',
            'payment_method' => 'GCash',
            'confirmed_at' => now(),
        ]);
    }
}
