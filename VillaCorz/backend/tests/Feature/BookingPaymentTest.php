<?php

namespace Tests\Feature;

use App\Mail\ReservationConfirmed;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\Service;
use App\Models\User;
use App\Services\PricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class BookingPaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_weekend_nights_use_the_weekend_price(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            '2026-11-13', // Friday
            '2026-11-16', // Monday
        );

        // Friday, Saturday and Sunday all bill at the weekend rate.
        $this->assertSame(3, $quote['nights']);
        $this->assertSame(4500.0, $quote['total']);
    }

    public function test_weekday_nights_use_the_weekday_price(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            '2026-11-16', // Monday
            '2026-11-18', // Wednesday
        );

        $this->assertSame(2, $quote['nights']);
        $this->assertSame(2000.0, $quote['total']);
    }

    public function test_weekend_boundary_only_charges_weekend_nights(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            '2026-11-12', // Thursday
            '2026-11-16', // Monday
        );

        // Thursday is weekday, then Friday/Saturday/Sunday are weekend.
        $this->assertSame(4, $quote['nights']);
        $this->assertSame(5500.0, $quote['total']);
    }

    public function test_discounts_are_applied_before_nightly_totals(): void
    {
        $service = $this->makeRoomService([
            'price' => 2000,
            'weekend_price' => 2500,
            'weekday_discount_type' => 'percent',
            'weekday_discount_value' => 10,
            'weekend_discount_type' => 'fixed',
            'weekend_discount_value' => 500,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            '2026-11-16', // Monday
            '2026-11-18', // Wednesday
        );

        // 2000 less 10% = 1800 per weekday night.
        $this->assertSame(3600.0, $quote['total']);
    }

    public function test_a_guest_can_create_a_booking_with_a_pending_payment(): void
    {
        $user = User::factory()->create();
        $service = $this->makeRoomService(['price' => 2000, 'pax' => 4]);

        $response = $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($service), [
                'Idempotency-Key' => 'booking-key-1',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'pending_payment')
            ->assertJsonPath('data.contact.email', 'guest@example.com')
            ->assertJsonPath('data.rooms.0.name', $service->name)
            ->assertJsonPath('data.payment.status', 'pending');

        $booking = Booking::query()->where('idempotency_key', 'booking-key-1')->firstOrFail();
        $payment = $booking->payment;

        $this->assertNotNull($payment);
        $this->assertSame('pending', $payment->status);
        $this->assertSame($booking->total, $payment->amount);
        $this->assertSame('+639000000000', $booking->contact_phone);
        $this->assertStringContainsString('/pay/', $payment->qr_url);
        $this->assertNull($booking->confirmed_at);

        $this->assertDatabaseHas('payment_events', [
            'booking_id' => $booking->id,
            'event' => 'booking_created',
        ]);
        $this->assertDatabaseHas('payment_events', [
            'payment_id' => $payment->id,
            'event' => 'payment_created',
        ]);
        $this->assertDatabaseHas('payment_events', [
            'payment_id' => $payment->id,
            'event' => 'qr_issued',
        ]);
    }

    public function test_the_same_idempotency_key_creates_only_one_booking(): void
    {
        $user = User::factory()->create();
        $service = $this->makeRoomService();
        $payload = $this->bookingPayload($service);

        $first = $this->actingAs($user)->postJson('/api/bookings', $payload, [
            'Idempotency-Key' => 'retry-key',
        ]);

        $second = $this->actingAs($user)->postJson('/api/bookings', [
            ...$payload,
            // Same number, different spelling: normalization must keep the
            // idempotency hash identical.
            'contact_phone' => '0900 000 0000',
        ], [
            'Idempotency-Key' => 'retry-key',
        ]);

        $first->assertCreated();
        $second->assertOk();

        $this->assertSame(
            $first->json('data.reference'),
            $second->json('data.reference'),
        );
        $this->assertSame(1, Booking::query()->count());
        $this->assertSame(1, Payment::query()->count());
    }

    public function test_reusing_an_idempotency_key_with_different_details_is_rejected(): void
    {
        $user = User::factory()->create();
        $service = $this->makeRoomService();

        $this->actingAs($user)->postJson(
            '/api/bookings',
            $this->bookingPayload($service),
            ['Idempotency-Key' => 'conflict-key'],
        )->assertCreated();

        $this->actingAs($user)->postJson(
            '/api/bookings',
            $this->bookingPayload($service, ['contact_name' => 'Someone Else']),
            ['Idempotency-Key' => 'conflict-key'],
        )->assertStatus(409);

        $this->assertSame(1, Booking::query()->count());
    }

    public function test_confirming_twice_marks_paid_and_emails_only_once(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $payment = $this->createBooking($user);
        $token = $this->phoneToken($payment);

        $this->post("/pay/{$token}", [
            'idempotency_key' => $payment->idempotency_key,
        ])->assertRedirect(route('pay.show', ['token' => $token]));

        $this->post("/pay/{$token}", [
            'idempotency_key' => $payment->idempotency_key,
        ])->assertRedirect(route('pay.show', ['token' => $token]));

        $payment->refresh();
        $booking = $payment->booking;

        $this->assertSame('paid', $payment->status);
        $this->assertNotNull($payment->paid_at);
        $this->assertSame('confirmed', $booking->status);
        $this->assertNotNull($booking->confirmed_at);
        $this->assertNotNull($booking->confirmation_email_sent_at);

        $this->assertSame(
            1,
            PaymentEvent::query()->where('event', 'payment_paid')->count(),
        );
        $this->assertSame(
            1,
            PaymentEvent::query()->where('event', 'confirm_duplicate')->count(),
        );
        $this->assertSame(
            1,
            PaymentEvent::query()->where('event', 'email_sent')->count(),
        );

        Mail::assertSent(ReservationConfirmed::class, 1);
        Mail::assertSent(
            ReservationConfirmed::class,
            fn (ReservationConfirmed $mail) => $mail->hasTo('guest@example.com')
                && $mail->booking->reference === $booking->reference,
        );
    }

    public function test_an_expired_qr_cannot_be_confirmed(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $payment = $this->createBooking($user);

        $payment->forceFill(['qr_expires_at' => now()->subMinute()])->save();
        $token = $this->phoneToken($payment);

        $this->post("/pay/{$token}", [
            'idempotency_key' => $payment->idempotency_key,
        ])->assertRedirect(route('pay.show', ['token' => $token]));

        $payment->refresh();

        $this->assertSame('expired', $payment->status);
        $this->assertSame('expired', $payment->booking->status);
        $this->assertNull($payment->paid_at);
        Mail::assertNothingSent();
    }

    public function test_qr_url_tracks_the_configured_public_origin(): void
    {
        $user = User::factory()->create();
        $payment = $this->createBooking($user);
        $path = parse_url($payment->qr_url, PHP_URL_PATH);

        // Simulate switching from localhost to a LAN address before the demo.
        config(['payments.public_url' => 'http://192.168.18.25:8000']);

        $this->actingAs($user)
            ->getJson("/api/bookings/{$payment->booking->reference}")
            ->assertOk()
            ->assertJsonPath(
                'data.payment.qr_url',
                'http://192.168.18.25:8000'.$path,
            );
    }

    public function test_the_phone_payment_page_can_confirm_the_payment(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $payment = $this->createBooking($user);

        $token = 'demo-phone-token-'.uniqid();
        $payment->forceFill(['qr_token_hash' => hash('sha256', $token)])->save();

        $this->get("/pay/{$token}")
            ->assertOk()
            ->assertSee($payment->booking->reference)
            ->assertSee('Confirm demo payment');

        $this->post("/pay/{$token}", [
            'idempotency_key' => $payment->idempotency_key,
        ])->assertRedirect(route('pay.show', ['token' => $token]));

        $payment->refresh();

        $this->assertSame('paid', $payment->status);
        $this->assertSame('confirmed', $payment->booking->status);
        Mail::assertSent(ReservationConfirmed::class, 1);

        $this->get("/pay/{$token}")
            ->assertOk()
            ->assertSee('Reservation confirmed')
            ->assertDontSee('Confirm demo payment');
    }

    public function test_the_status_endpoint_reports_the_confirmed_payment(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $payment = $this->createBooking($user);

        $this->actingAs($user)
            ->getJson("/api/payments/{$payment->reference}/status")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.email_sent', false);

        $this->confirmOnPhone($payment);

        $this->actingAs($user)
            ->getJson("/api/payments/{$payment->reference}/status")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.booking_status', 'confirmed')
            ->assertJsonPath('data.email_sent', true);
    }

    public function test_a_pending_payment_does_not_hold_the_dates(): void
    {
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();
        $service = $this->makeRoomService();
        $checkIn = now()->addDays(9)->startOfDay();

        $payload = $this->bookingPayload($service, [
            'check_in' => $checkIn->toDateString(),
            'check_out' => $checkIn->copy()->addDays(2)->toDateString(),
        ]);

        $this->actingAs($firstUser)
            ->postJson('/api/bookings', $payload, ['Idempotency-Key' => 'hold-a'])
            ->assertCreated();

        // The first guest has not scanned yet, so the dates are still free.
        $this->actingAs($secondUser)
            ->postJson('/api/bookings', $payload, ['Idempotency-Key' => 'hold-b'])
            ->assertCreated();

        $this->assertSame(2, Booking::query()->count());
        $this->assertSame(
            2,
            Booking::query()->where('status', 'pending_payment')->count(),
        );
    }

    public function test_confirmation_fails_when_another_guest_already_took_the_room(): void
    {
        Mail::fake();

        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();
        $service = $this->makeRoomService();
        $checkIn = now()->addDays(14)->startOfDay();

        $payload = $this->bookingPayload($service, [
            'check_in' => $checkIn->toDateString(),
            'check_out' => $checkIn->copy()->addDays(2)->toDateString(),
        ]);

        $this->actingAs($firstUser)
            ->postJson('/api/bookings', $payload, ['Idempotency-Key' => 'race-a'])
            ->assertCreated();
        $this->actingAs($secondUser)
            ->postJson('/api/bookings', $payload, ['Idempotency-Key' => 'race-b'])
            ->assertCreated();

        $firstBooking = Booking::query()->where('idempotency_key', 'race-a')->firstOrFail();
        $secondBooking = Booking::query()->where('idempotency_key', 'race-b')->firstOrFail();

        $this->confirmOnPhone($firstBooking->payment);

        $token = $this->phoneToken($secondBooking->payment);
        $this->post("/pay/{$token}", [
            'idempotency_key' => $secondBooking->payment->idempotency_key,
        ])->assertRedirect(route('pay.show', ['token' => $token]));

        $secondBooking->refresh();
        $secondPayment = $secondBooking->payment->fresh();

        $this->assertSame('confirmed', $firstBooking->fresh()->status);
        $this->assertSame('cancelled', $secondBooking->status);
        $this->assertSame('cancelled', $secondPayment->status);
        $this->assertNull($secondPayment->paid_at);
        $this->assertNull($secondBooking->confirmation_email_sent_at);

        $this->assertDatabaseHas('payment_events', [
            'payment_id' => $secondPayment->id,
            'event' => 'payment_conflict',
        ]);

        // Only the first guest receives a confirmation email.
        Mail::assertSent(ReservationConfirmed::class, 1);
        Mail::assertSent(
            ReservationConfirmed::class,
            fn (ReservationConfirmed $mail) => $mail->booking->reference === $firstBooking->reference,
        );

        $this->get("/pay/{$token}")
            ->assertOk()
            ->assertSee('Reservation unavailable');
    }

    public function test_another_guest_cannot_read_the_payment_status(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $payment = $this->createBooking($owner);

        $this->actingAs($stranger)
            ->getJson("/api/payments/{$payment->reference}/status")
            ->assertForbidden();
    }

    /**
     * Create a booking through the API and return its payment.
     */
    private function createBooking(User $user, ?Service $service = null): Payment
    {
        $service ??= $this->makeRoomService();
        $key = 'booking-'.uniqid();

        $response = $this->actingAs($user)->postJson(
            '/api/bookings',
            $this->bookingPayload($service),
            ['Idempotency-Key' => $key],
        );

        $response->assertCreated();

        return Booking::query()
            ->where('reference', $response->json('data.reference'))
            ->firstOrFail()
            ->payment;
    }

    /**
     * Give a payment a known phone token so tests can open the QR page.
     */
    private function phoneToken(Payment $payment): string
    {
        $token = 'phone-'.uniqid();

        $payment->forceFill(['qr_token_hash' => hash('sha256', $token)])->save();

        return $token;
    }

    private function confirmOnPhone(Payment $payment): void
    {
        $token = $this->phoneToken($payment);

        $this->post("/pay/{$token}", [
            'idempotency_key' => $payment->idempotency_key,
        ])->assertRedirect(route('pay.show', ['token' => $token]));
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function bookingPayload(Service $service, array $overrides = []): array
    {
        $checkIn = now()->addDays(5)->startOfDay();

        return array_merge([
            'check_in' => $checkIn->toDateString(),
            'check_out' => $checkIn->copy()->addDays(2)->toDateString(),
            'rooms' => [
                [
                    'service_id' => $service->id,
                    'adults' => 2,
                    'kids' => 0,
                ],
            ],
            'contact_name' => 'Test Guest',
            'contact_email' => 'guest@example.com',
            'contact_phone' => '+63 900 000 0000',
            'payment_method' => 'GCash',
        ], $overrides);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeRoomService(array $overrides = []): Service
    {
        return Service::create(array_merge([
            'name' => 'Ocean Room',
            'description' => 'A room with an ocean view.',
            'kind' => 'room',
            'price' => 1500,
            'weekend_price' => 1800,
            'pax' => 4,
            'status' => 'active',
        ], $overrides));
    }
}
