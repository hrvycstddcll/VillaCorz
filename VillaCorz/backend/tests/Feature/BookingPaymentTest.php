<?php

namespace Tests\Feature;

use App\Mail\ReservationConfirmed;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\Service;
use App\Models\User;
use App\Services\PricingService;
use App\Support\StayTime;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class BookingPaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_weekend_paid_days_use_the_weekend_price(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            StayTime::parseLocal('2026-11-13', '10:00'), // Friday
            3,
        );

        // Friday, Saturday and Sunday all bill at the weekend rate.
        $this->assertSame(3, $quote['paid_days']);
        $this->assertSame(3, $quote['nights']);
        $this->assertSame(4500.0, $quote['total']);
    }

    public function test_weekday_paid_days_use_the_weekday_price(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            StayTime::parseLocal('2026-11-16', '10:00'), // Monday
            2,
        );

        $this->assertSame(2, $quote['paid_days']);
        $this->assertSame(2000.0, $quote['total']);
    }

    public function test_weekend_boundary_only_charges_weekend_paid_days(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            StayTime::parseLocal('2026-11-12', '10:00'), // Thursday
            4,
        );

        // Thursday is weekday, then Friday/Saturday/Sunday are weekend.
        $this->assertSame(4, $quote['paid_days']);
        $this->assertSame(5500.0, $quote['total']);
    }

    public function test_one_paid_day_charges_one_full_day(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            StayTime::parseLocal('2026-11-16', '10:00'),
            1,
        );

        $this->assertSame(1, $quote['paid_days']);
        $this->assertSame(1000.0, $quote['total']);
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
            StayTime::parseLocal('2026-11-16', '10:00'), // Monday
            2,
        );

        // 2000 less 10% = 1800 per weekday paid day.
        $this->assertSame(3600.0, $quote['total']);
    }

    public function test_additional_heads_are_charged_per_weekday_paid_day(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
            'pax' => 2,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            StayTime::parseLocal('2026-11-16', '10:00'), // Monday
            2,
            [$service->id => 3],
        );

        $this->assertSame(2, $quote['paid_days']);
        $this->assertSame(1, $quote['rooms'][0]['additional_heads']);
        $this->assertSame(100.0, $quote['rooms'][0]['additional_head_total']);
        $this->assertSame(2100.0, $quote['total']);
    }

    public function test_additional_heads_are_charged_per_weekend_paid_day(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
            'pax' => 2,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            StayTime::parseLocal('2026-11-13', '10:00'), // Friday
            2,
            [$service->id => 4],
        );

        $this->assertSame(2, $quote['paid_days']);
        $this->assertSame(2, $quote['rooms'][0]['additional_heads']);
        $this->assertSame(400.0, $quote['rooms'][0]['additional_head_total']);
        $this->assertSame(3400.0, $quote['total']);
    }

    public function test_additional_head_rates_follow_mixed_weekday_and_weekend_paid_days(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
            'pax' => 2,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            StayTime::parseLocal('2026-11-12', '10:00'), // Thursday
            4,
            [$service->id => 3],
        );

        $this->assertSame(4, $quote['paid_days']);
        $this->assertSame(350.0, $quote['rooms'][0]['additional_head_total']);
        $this->assertSame(5850.0, $quote['total']);
    }

    public function test_no_additional_head_fee_at_or_below_pax(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
            'pax' => 4,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            StayTime::parseLocal('2026-11-16', '10:00'),
            2,
            [$service->id => 4],
        );

        $this->assertSame(0, $quote['rooms'][0]['additional_heads']);
        $this->assertSame(0.0, $quote['rooms'][0]['additional_head_total']);
        $this->assertSame(2000.0, $quote['total']);
    }

    public function test_no_additional_head_fee_when_pax_is_not_set(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
            'pax' => null,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            StayTime::parseLocal('2026-11-16', '10:00'),
            2,
            [$service->id => 6],
        );

        $this->assertSame(0, $quote['rooms'][0]['additional_heads']);
        $this->assertSame(0.0, $quote['rooms'][0]['additional_head_total']);
        $this->assertSame(2000.0, $quote['total']);
    }

    public function test_discounts_do_not_apply_to_additional_head_fees(): void
    {
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
            'weekday_discount_type' => 'fixed',
            'weekday_discount_value' => 100,
            'pax' => 2,
        ]);

        $quote = app(PricingService::class)->quote(
            collect([$service]),
            StayTime::parseLocal('2026-11-16', '10:00'),
            2,
            [$service->id => 3],
        );

        // Two weekday paid days: (1000 - 100) + 50 per day.
        $this->assertSame(100.0, $quote['rooms'][0]['additional_head_total']);
        $this->assertSame(1900.0, $quote['total']);
    }

    public function test_booking_above_pax_charges_and_snapshots_additional_heads(): void
    {
        $user = User::factory()->create();
        $service = $this->makeRoomService([
            'price' => 1000,
            'weekend_price' => 1500,
            'pax' => 2,
        ]);

        $checkIn = StayTime::parseLocal(now()->next('Monday')->toDateString(), '10:00');

        $response = $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($service, [
                'check_in' => $checkIn->toIso8601String(),
                'paid_days' => 2,
                'rooms' => [
                    [
                        'service_id' => $service->id,
                        'adults' => 3,
                        'kids' => 0,
                    ],
                ],
            ]), [
                'Idempotency-Key' => 'booking-key-additional-heads',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.total', '2100.00')
            ->assertJsonPath('data.paid_days', 2)
            ->assertJsonPath('data.rooms.0.additional_heads', 1)
            ->assertJsonPath('data.rooms.0.additional_head_total', '100.00');

        $booking = Booking::query()
            ->where('idempotency_key', 'booking-key-additional-heads')
            ->firstOrFail();
        $room = $booking->rooms()->firstOrFail();

        $this->assertSame('2100.00', $booking->total);
        $this->assertSame(1, $room->additional_heads);
        $this->assertSame('50.00', $room->additional_head_weekday_price);
        $this->assertSame('100.00', $room->additional_head_total);
        $this->assertSame('2100.00', $room->line_total);
        $this->assertSame($booking->total, $booking->payment?->amount);
    }

    public function test_pht_date_time_is_stored_as_an_utc_instant(): void
    {
        $user = User::factory()->create();
        $service = $this->makeRoomService();
        $checkIn = StayTime::parseLocal('2026-12-01', '22:30');
        $checkOut = StayTime::parseLocal('2026-12-03', '20:30');

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($service, [
                'check_in' => $checkIn->toIso8601String(),
                'paid_days' => 2,
            ]), ['Idempotency-Key' => 'booking-key-pht-instant'])
            ->assertCreated();

        $this->assertDatabaseHas('bookings', [
            'idempotency_key' => 'booking-key-pht-instant',
            'check_in' => $checkIn->toDateTimeString(),
            'check_out' => $checkOut->toDateTimeString(),
            'paid_days' => 2,
        ]);
    }

    public function test_same_idempotency_key_with_different_paid_days_is_rejected(): void
    {
        $user = User::factory()->create();
        $service = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDays(12)->toDateString();

        $this->actingAs($user)->postJson(
            '/api/bookings',
            $this->bookingPayload($service, [
                'check_in' => StayTime::parseLocal($date, '10:00')->toIso8601String(),
                'paid_days' => 1,
            ]),
            ['Idempotency-Key' => 'time-sensitive-key'],
        )->assertCreated();

        $this->actingAs($user)->postJson(
            '/api/bookings',
            $this->bookingPayload($service, [
                'check_in' => StayTime::parseLocal($date, '10:00')->toIso8601String(),
                'paid_days' => 2,
            ]),
            ['Idempotency-Key' => 'time-sensitive-key'],
        )->assertStatus(409);

        $this->assertSame(1, Booking::query()->count());
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

    public function test_the_spa_can_confirm_a_payment(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $payment = $this->createBooking($user);

        $this->actingAs($user)
            ->postJson("/api/payments/{$payment->reference}/confirm")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.booking_status', 'confirmed')
            ->assertJsonPath('data.conflict', false)
            ->assertJsonPath('data.already_paid', false)
            ->assertJsonPath('data.email_sent', true);

        $payment->refresh();

        $this->assertSame('paid', $payment->status);
        $this->assertSame('confirmed', $payment->booking->status);
        Mail::assertSent(ReservationConfirmed::class, 1);
    }

    public function test_spa_payment_confirmation_is_idempotent(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $payment = $this->createBooking($user);

        $this->actingAs($user)
            ->postJson("/api/payments/{$payment->reference}/confirm")
            ->assertOk()
            ->assertJsonPath('data.already_paid', false);

        $this->actingAs($user)
            ->postJson("/api/payments/{$payment->reference}/confirm")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.already_paid', true);

        $this->assertSame(
            1,
            PaymentEvent::query()->where('event', 'payment_paid')->count(),
        );
        Mail::assertSent(ReservationConfirmed::class, 1);
    }

    public function test_only_the_payment_owner_can_confirm_from_the_spa(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $payment = $this->createBooking($owner);

        $this->actingAs($otherUser)
            ->postJson("/api/payments/{$payment->reference}/confirm")
            ->assertForbidden();

        $this->assertSame('pending', $payment->fresh()->status);
    }

    public function test_an_expired_payment_cannot_be_confirmed_from_the_spa(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $payment = $this->createBooking($user);
        $payment->forceFill(['qr_expires_at' => now()->subMinute()])->save();

        $this->actingAs($user)
            ->postJson("/api/payments/{$payment->reference}/confirm")
            ->assertOk()
            ->assertJsonPath('data.status', 'expired')
            ->assertJsonPath('data.expired', true)
            ->assertJsonPath('data.email_sent', false);

        $payment->refresh();

        $this->assertNull($payment->paid_at);
        $this->assertSame('expired', $payment->booking->status);
        Mail::assertNothingSent();
    }

    public function test_back_to_back_bookings_are_allowed_without_a_buffer(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $service = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDays(10)->toDateString();
        $nextDate = now()->setTimezone(StayTime::TIMEZONE)->addDays(11)->toDateString();

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($service, [
                'check_in' => StayTime::parseLocal($date, '10:00')->toIso8601String(),
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'adjacent-a'])
            ->assertCreated();

        $first = Booking::query()->where('idempotency_key', 'adjacent-a')->firstOrFail();
        $this->confirmOnPhone($first->payment);

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($service, [
                'check_in' => StayTime::parseLocal($nextDate, '10:00')->toIso8601String(),
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'adjacent-b'])
            ->assertCreated();

        $second = Booking::query()->where('idempotency_key', 'adjacent-b')->firstOrFail();
        $this->confirmOnPhone($second->payment);

        $this->assertSame('confirmed', $first->fresh()->status);
        $this->assertSame('confirmed', $second->fresh()->status);
    }

    public function test_partially_overlapping_booking_is_rejected_at_creation(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $service = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDays(11)->toDateString();

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($service, [
                'check_in' => StayTime::parseLocal($date, '10:00')->toIso8601String(),
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'overlap-a'])
            ->assertCreated();

        $this->confirmOnPhone(
            Booking::query()->where('idempotency_key', 'overlap-a')->firstOrFail()->payment,
        );

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($service, [
                'check_in' => StayTime::parseLocal($date, '12:00')->toIso8601String(),
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'overlap-b'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('rooms');

        $this->assertSame(1, Booking::query()->count());
    }

    public function test_partially_overlapping_booking_is_cancelled_on_confirmation(): void
    {
        Mail::fake();

        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();
        $service = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDays(13)->toDateString();

        $this->actingAs($firstUser)
            ->postJson('/api/bookings', $this->bookingPayload($service, [
                'check_in' => StayTime::parseLocal($date, '10:00')->toIso8601String(),
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'race-overlap-a'])
            ->assertCreated();

        $this->actingAs($secondUser)
            ->postJson('/api/bookings', $this->bookingPayload($service, [
                'check_in' => StayTime::parseLocal($date, '12:00')->toIso8601String(),
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'race-overlap-b'])
            ->assertCreated();

        $first = Booking::query()->where('idempotency_key', 'race-overlap-a')->firstOrFail();
        $second = Booking::query()->where('idempotency_key', 'race-overlap-b')->firstOrFail();

        $this->confirmOnPhone($first->payment);

        $token = $this->phoneToken($second->payment);
        $this->post("/pay/{$token}", [
            'idempotency_key' => $second->payment->idempotency_key,
        ])->assertRedirect(route('pay.show', ['token' => $token]));

        $this->assertSame('confirmed', $first->fresh()->status);
        $this->assertSame('cancelled', $second->fresh()->status);
        $this->assertSame('cancelled', $second->payment->fresh()->status);
    }

    public function test_an_active_pending_whole_villa_booking_rejects_a_room_booking(): void
    {
        $user = User::factory()->create();
        $villa = $this->makeVillaService();
        $room = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDays(20)->toDateString();
        $checkIn = StayTime::parseLocal($date, '10:00')->toIso8601String();

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($villa, [
                'check_in' => $checkIn,
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'pending-villa-a'])
            ->assertCreated();

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($room, [
                'check_in' => $checkIn,
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'pending-villa-b'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('rooms');

        $this->assertSame(1, Booking::query()->count());
    }

    public function test_an_expired_pending_whole_villa_booking_does_not_reject_a_room_booking(): void
    {
        $user = User::factory()->create();
        $villa = $this->makeVillaService();
        $room = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDays(21)->toDateString();
        $checkIn = StayTime::parseLocal($date, '10:00')->toIso8601String();

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($villa, [
                'check_in' => $checkIn,
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'expired-villa-a'])
            ->assertCreated();

        Booking::query()
            ->where('idempotency_key', 'expired-villa-a')
            ->firstOrFail()
            ->forceFill(['expires_at' => now()->subHour()])
            ->save();

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($room, [
                'check_in' => $checkIn,
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'expired-villa-b'])
            ->assertCreated();

        $this->assertSame(2, Booking::query()->count());
    }

    public function test_an_active_pending_room_booking_rejects_a_whole_villa_booking(): void
    {
        $user = User::factory()->create();
        $villa = $this->makeVillaService();
        $room = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDays(22)->toDateString();
        $checkIn = StayTime::parseLocal($date, '10:00')->toIso8601String();

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($room, [
                'check_in' => $checkIn,
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'pending-room-a'])
            ->assertCreated();

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($villa, [
                'check_in' => $checkIn,
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'pending-room-b'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('rooms');

        $this->assertSame(1, Booking::query()->count());
    }

    public function test_confirming_the_whole_villa_cancels_a_conflicting_room_booking(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $villa = $this->makeVillaService();
        $room = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDays(23)->toDateString();
        $checkIn = StayTime::parseLocal($date, '10:00')->toIso8601String();

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($room, [
                'check_in' => $checkIn,
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'villa-priority-room'])
            ->assertCreated();

        $roomBooking = Booking::query()
            ->where('idempotency_key', 'villa-priority-room')
            ->firstOrFail();
        $roomBooking->forceFill(['expires_at' => now()->subHour()])->save();

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($villa, [
                'check_in' => $checkIn,
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'villa-priority-villa'])
            ->assertCreated();

        $villaBooking = Booking::query()
            ->where('idempotency_key', 'villa-priority-villa')
            ->firstOrFail();
        $roomBooking->forceFill(['expires_at' => now()->addHour()])->save();

        $this->confirmOnPhone($villaBooking->payment);

        $this->assertSame('confirmed', $villaBooking->fresh()->status);
        $this->assertSame('cancelled', $roomBooking->fresh()->status);
        $this->assertSame('cancelled', $roomBooking->payment->fresh()->status);
        $this->assertDatabaseHas('payment_events', [
            'payment_id' => $roomBooking->payment->id,
            'event' => 'payment_conflict',
        ]);
    }

    public function test_confirming_a_room_cancels_the_room_when_a_whole_villa_holds_the_dates(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $villa = $this->makeVillaService();
        $room = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDays(24)->toDateString();
        $checkIn = StayTime::parseLocal($date, '10:00')->toIso8601String();

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($room, [
                'check_in' => $checkIn,
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'villa-priority-room-b'])
            ->assertCreated();

        $roomBooking = Booking::query()
            ->where('idempotency_key', 'villa-priority-room-b')
            ->firstOrFail();
        $roomBooking->forceFill(['expires_at' => now()->subHour()])->save();

        $this->actingAs($user)
            ->postJson('/api/bookings', $this->bookingPayload($villa, [
                'check_in' => $checkIn,
                'paid_days' => 1,
            ]), ['Idempotency-Key' => 'villa-priority-villa-b'])
            ->assertCreated();

        $villaBooking = Booking::query()
            ->where('idempotency_key', 'villa-priority-villa-b')
            ->firstOrFail();
        $roomBooking->forceFill(['expires_at' => now()->addHour()])->save();

        $this->confirmOnPhone($roomBooking->payment);

        $this->assertSame('pending_payment', $villaBooking->fresh()->status);
        $this->assertSame('cancelled', $roomBooking->fresh()->status);
        $this->assertSame('cancelled', $roomBooking->payment->fresh()->status);
    }

    public function test_a_pending_payment_does_not_hold_the_dates(): void
    {
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();
        $service = $this->makeRoomService();
        $checkIn = now()->addDays(9)->startOfDay();

        $payload = $this->bookingPayload($service, [
            'check_in' => StayTime::parseLocal($checkIn->toDateString(), '10:00')->toIso8601String(),
            'paid_days' => 2,
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
            'check_in' => StayTime::parseLocal($checkIn->toDateString(), '10:00')->toIso8601String(),
            'paid_days' => 2,
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

    public function test_a_customer_can_cancel_their_confirmed_booking(): void
    {
        Mail::fake();

        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $service = $this->makeRoomService();
        $checkIn = now()->addDays(20)->startOfDay();

        $payload = $this->bookingPayload($service, [
            'check_in' => StayTime::parseLocal($checkIn->toDateString(), '10:00')->toIso8601String(),
            'paid_days' => 2,
        ]);

        $this->actingAs($owner)
            ->postJson('/api/bookings', $payload, ['Idempotency-Key' => 'cancel-a'])
            ->assertCreated();

        $booking = Booking::query()->where('idempotency_key', 'cancel-a')->firstOrFail();
        $this->confirmOnPhone($booking->payment);

        $this->assertSame('confirmed', $booking->fresh()->status);

        $this->actingAs($stranger)
            ->postJson("/api/bookings/{$booking->reference}/cancel")
            ->assertForbidden();

        $this->actingAs($owner)
            ->postJson("/api/bookings/{$booking->reference}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $booking->refresh();
        $this->assertSame('cancelled', $booking->status);
        $this->assertSame('cancelled', $booking->payment->fresh()->status);

        // Cancelling again is rejected.
        $this->actingAs($owner)
            ->postJson("/api/bookings/{$booking->reference}/cancel")
            ->assertStatus(422);

        // The slot is released, so another guest can book the same dates.
        $this->actingAs($stranger)
            ->postJson('/api/bookings', $payload, ['Idempotency-Key' => 'cancel-b'])
            ->assertCreated();

        // Cancel window: 6 days before check-in is rejected, exactly 7 is allowed.
        $lateCheckIn = now()->addDays(6)->startOfDay();
        $latePayload = $this->bookingPayload($service, [
            'check_in' => StayTime::parseLocal($lateCheckIn->toDateString(), '10:00')->toIso8601String(),
            'paid_days' => 2,
        ]);
        $this->actingAs($owner)
            ->postJson('/api/bookings', $latePayload, ['Idempotency-Key' => 'late-a'])
            ->assertCreated();
        $lateBooking = Booking::query()->where('idempotency_key', 'late-a')->firstOrFail();
        $this->confirmOnPhone($lateBooking->payment);
        $this->actingAs($owner)
            ->postJson("/api/bookings/{$lateBooking->reference}/cancel")
            ->assertStatus(422);

        $edgeCheckIn = now()->addDays(14)->startOfDay();
        $edgePayload = $this->bookingPayload($service, [
            'check_in' => StayTime::parseLocal($edgeCheckIn->toDateString(), '10:00')->toIso8601String(),
            'paid_days' => 2,
        ]);
        $this->actingAs($owner)
            ->postJson('/api/bookings', $edgePayload, ['Idempotency-Key' => 'edge-a'])
            ->assertCreated();
        $edgeBooking = Booking::query()->where('idempotency_key', 'edge-a')->firstOrFail();
        $this->confirmOnPhone($edgeBooking->payment);
        $this->actingAs($owner)
            ->postJson("/api/bookings/{$edgeBooking->reference}/cancel")
            ->assertOk();

        // The "Booked" view only returns confirmed, upcoming bookings, and
        // excludes cancelled ones.
        $this->actingAs($owner)
            ->getJson('/api/bookings?status=booked')
            ->assertOk()
            ->assertJsonFragment(['reference' => $lateBooking->reference])
            ->assertJsonMissing(['reference' => $edgeBooking->reference]);
    }

    public function test_a_completed_booking_cannot_request_a_refund(): void
    {
        Mail::fake();

        $owner = User::factory()->create();
        $checkOut = now()->subDays(3)->startOfDay();

        $booking = Booking::create([
            'user_id' => $owner->id,
            'reference' => 'VC-COMPLETED-1',
            'contact_name' => 'Completed Guest',
            'contact_email' => 'completed@example.com',
            'check_in' => $checkOut->copy()->subDays(2),
            'check_out' => $checkOut,
            'nights' => 2,
            'paid_days' => 2,
            'adults' => 2,
            'kids' => 0,
            'subtotal' => 3000,
            'total' => 3000,
            'currency' => 'PHP',
            'status' => 'confirmed',
            'payment_method' => 'GCash',
            'confirmed_at' => $checkOut->copy()->subDays(10),
            'completed_at' => $checkOut,
        ]);

        // No cancellation/refund request can be filed after the stay ends.
        $this->actingAs($owner)
            ->postJson("/api/bookings/{$booking->reference}/cancel-request", [
                'reason' => 'I want a refund after my stay.',
            ])
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertDatabaseCount('cancellation_requests', 0);

        // Direct cancellation is blocked for completed stays as well.
        $this->actingAs($owner)
            ->postJson("/api/bookings/{$booking->reference}/cancel")
            ->assertStatus(422);

        $this->assertSame('confirmed', $booking->fresh()->status);
    }

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
        $checkInDate = now()
            ->setTimezone(StayTime::TIMEZONE)
            ->addDays(5)
            ->toDateString();
        $checkIn = StayTime::parseLocal($checkInDate, '10:00');

        $payload = array_merge([
            'check_in' => $checkIn->toIso8601String(),
            'paid_days' => 3,
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

        if (array_key_exists('check_out', $payload) && ! array_key_exists('paid_days', $overrides)) {
            $payload['paid_days'] = \App\Support\StayPolicy::paidDaysFor($payload['check_in'], $payload['check_out']);
        }
        unset($payload['check_out']);

        return $payload;
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
            'additional_head_weekday_price' => 50,
            'additional_head_weekend_price' => 100,
            'pax' => 4,
            'status' => 'active',
        ], $overrides));
    }

    private function makeVillaService(array $overrides = []): Service
    {
        return Service::create(array_merge([
            'name' => 'The Whole Villa',
            'description' => 'Entire property.',
            'kind' => 'exclusive',
            'price' => 15000,
            'weekend_price' => 18000,
            'pax' => 12,
            'status' => 'active',
        ], $overrides));
    }
}
