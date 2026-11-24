<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\Service;
use App\Models\User;
use App\Support\StayTime;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AvailabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_confirmed_booking_marks_the_room_unavailable_for_an_overlapping_range(): void
    {
        $service = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDay()->toDateString();
        $this->seedBooking($service, $date, 'confirmed');

        $this->getJson('/api/services/availability?'.http_build_query([
            'check_in' => StayTime::parseLocal($date, '10:00')->toIso8601String(),
            'paid_days' => 1,
        ]))
            ->assertOk()
            ->assertJsonPath('data.rooms.0.id', $service->id)
            ->assertJsonPath('data.rooms.0.available', false)
            ->assertJsonPath('data.basis', 'confirmed and active pending reservations');
    }

    public function test_a_pending_payment_does_not_mark_the_room_unavailable(): void
    {
        $service = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDay()->toDateString();
        $this->seedBooking($service, $date, 'pending_payment');

        $this->getJson('/api/services/availability?'.http_build_query([
            'check_in' => StayTime::parseLocal($date, '10:00')->toIso8601String(),
            'paid_days' => 1,
        ]))
            ->assertOk()
            ->assertJsonPath('data.rooms.0.available', true);
    }

    public function test_an_active_pending_whole_villa_booking_marks_rooms_unavailable(): void
    {
        $room = $this->makeRoomService(['name' => 'Room 1']);
        $villa = $this->makeVillaService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDay()->toDateString();
        $this->seedBooking($villa, $date, 'pending_payment', now()->addHour());

        $this->getJson('/api/services/availability?'.http_build_query([
            'check_in' => StayTime::parseLocal($date, '10:00')->toIso8601String(),
            'paid_days' => 1,
        ]))
            ->assertOk()
            ->assertJsonPath('data.rooms.0.id', $room->id)
            ->assertJsonPath('data.rooms.0.available', false);
    }

    public function test_an_expired_pending_whole_villa_booking_does_not_block_rooms(): void
    {
        $room = $this->makeRoomService(['name' => 'Room 1']);
        $villa = $this->makeVillaService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDay()->toDateString();
        $this->seedBooking($villa, $date, 'pending_payment', now()->subHour());

        $this->getJson('/api/services/availability?'.http_build_query([
            'check_in' => StayTime::parseLocal($date, '10:00')->toIso8601String(),
            'paid_days' => 1,
        ]))
            ->assertOk()
            ->assertJsonPath('data.rooms.0.id', $room->id)
            ->assertJsonPath('data.rooms.0.available', true)
            ->assertJsonPath('data.rooms.1.id', $villa->id)
            ->assertJsonPath('data.rooms.1.available', true);
    }

    public function test_an_active_pending_room_booking_blocks_the_whole_villa(): void
    {
        $room = $this->makeRoomService(['name' => 'Room 1']);
        $villa = $this->makeVillaService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDay()->toDateString();
        $this->seedBooking($room, $date, 'pending_payment', now()->addHour());

        $this->getJson('/api/services/availability?'.http_build_query([
            'check_in' => StayTime::parseLocal($date, '10:00')->toIso8601String(),
            'paid_days' => 1,
        ]))
            ->assertOk()
            ->assertJsonPath('data.rooms.0.id', $room->id)
            ->assertJsonPath('data.rooms.0.available', true)
            ->assertJsonPath('data.rooms.1.id', $villa->id)
            ->assertJsonPath('data.rooms.1.available', false);
    }

    public function test_back_to_back_booking_remains_available_after_turnover(): void
    {
        $service = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDay()->toDateString();
        $this->seedBooking($service, $date, 'confirmed');
        $nextDate = now()->setTimezone(StayTime::TIMEZONE)->addDays(2)->toDateString();

        $this->getJson('/api/services/availability?'.http_build_query([
            'check_in' => StayTime::parseLocal($nextDate, '10:00')->toIso8601String(),
            'paid_days' => 1,
        ]))
            ->assertOk()
            ->assertJsonPath('data.rooms.0.available', true);
    }

    public function test_blocked_dates_returns_the_pht_dates_of_confirmed_bookings(): void
    {
        $service = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDay()->toDateString();
        $this->seedBooking($service, $date, 'confirmed');

        $this->getJson("/api/services/{$service->id}/blocked-dates?".http_build_query([
            'from' => $date,
            'to' => now()->setTimezone(StayTime::TIMEZONE)->addDays(7)->toDateString(),
        ]))
            ->assertOk()
            ->assertJsonPath('data.service_id', $service->id)
            ->assertJsonPath('data.unavailable_dates.0', $date);
    }

    public function test_a_booked_room_blocks_the_whole_villa(): void
    {
        $room = $this->makeRoomService(['name' => 'Room 5']);
        $villa = Service::create([
            'name' => 'The Whole Villa',
            'description' => 'Entire property.',
            'kind' => 'exclusive',
            'price' => 15000,
            'weekend_price' => 18000,
            'pax' => 12,
            'status' => 'active',
        ]);
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDay()->toDateString();
        $this->seedBooking($room, $date, 'confirmed');

        $this->getJson('/api/services/availability?'.http_build_query([
            'check_in' => StayTime::parseLocal($date, '10:00')->toIso8601String(),
            'paid_days' => 1,
        ]))
            ->assertOk()
            ->assertJsonPath('data.rooms.0.id', $room->id)
            ->assertJsonPath('data.rooms.0.available', false)
            ->assertJsonPath('data.rooms.1.id', $villa->id)
            ->assertJsonPath('data.rooms.1.available', false);
    }

    public function test_a_booked_whole_villa_marks_every_room_unavailable(): void
    {
        $firstRoom = $this->makeRoomService(['name' => 'Room 1']);
        $secondRoom = $this->makeRoomService(['name' => 'Room 2']);
        $villa = Service::create([
            'name' => 'The Whole Villa',
            'description' => 'Entire property.',
            'kind' => 'exclusive',
            'price' => 15000,
            'weekend_price' => 18000,
            'pax' => 12,
            'status' => 'active',
        ]);
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDay()->toDateString();
        $this->seedBooking($villa, $date, 'confirmed');

        $this->getJson('/api/services/availability?'.http_build_query([
            'check_in' => StayTime::parseLocal($date, '10:00')->toIso8601String(),
            'paid_days' => 1,
        ]))
            ->assertOk()
            ->assertJsonPath('data.rooms.0.id', $firstRoom->id)
            ->assertJsonPath('data.rooms.0.available', false)
            ->assertJsonPath('data.rooms.1.id', $secondRoom->id)
            ->assertJsonPath('data.rooms.1.available', false)
            ->assertJsonPath('data.rooms.2.id', $villa->id)
            ->assertJsonPath('data.rooms.2.available', false);

        $this->getJson("/api/services/{$firstRoom->id}/blocked-dates?".http_build_query([
            'from' => $date,
            'to' => now()->setTimezone(StayTime::TIMEZONE)->addDays(7)->toDateString(),
        ]))
            ->assertOk()
            ->assertJsonPath('data.unavailable_dates.0', $date);
    }

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

    private function seedBooking(
        Service $service,
        string $date,
        string $status,
        mixed $expiresAt = null,
    ): Booking {
        $user = User::create([
            'firstname' => 'Existing',
            'lastname' => 'Guest',
            'email' => uniqid().'@example.com',
            'password' => 'password',
            'role' => 'customer',
        ]);

        $checkIn = StayTime::parseLocal($date, '10:00');
        $booking = Booking::create([
            'user_id' => $user->id,
            'reference' => 'BK-'.uniqid(),
            'contact_name' => 'Existing Guest',
            'contact_email' => $user->email,
            'contact_phone' => '+639171234567',
            'check_in' => $checkIn,
            'check_out' => \App\Support\StayPolicy::checkOutFor($checkIn, 1),
            'nights' => 1,
            'paid_days' => 1,
            'adults' => 2,
            'kids' => 0,
            'subtotal' => 1500,
            'total' => 1500,
            'currency' => 'PHP',
            'status' => $status,
            'payment_method' => 'GCash',
            'expires_at' => $expiresAt,
            'confirmed_at' => $status === 'confirmed' ? now() : null,
        ]);

        BookingRoom::create([
            'booking_id' => $booking->id,
            'service_id' => $service->id,
            'service_name' => $service->name,
            'kind' => $service->kind,
            'adults' => 2,
            'kids' => 0,
            'weekday_price' => $service->price,
            'weekend_price' => $service->weekend_price,
            'line_total' => 1500,
        ]);

        return $booking;
    }
}
