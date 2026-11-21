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
            'check_in' => StayTime::parseLocal($date, '18:00')->toIso8601String(),
            'check_out' => StayTime::parseLocal($date, '22:00')->toIso8601String(),
        ]))
            ->assertOk()
            ->assertJsonPath('data.rooms.0.id', $service->id)
            ->assertJsonPath('data.rooms.0.available', false)
            ->assertJsonPath('data.basis', 'confirmed bookings only');
    }

    public function test_a_pending_payment_does_not_mark_the_room_unavailable(): void
    {
        $service = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDay()->toDateString();
        $this->seedBooking($service, $date, 'pending_payment');

        $this->getJson('/api/services/availability?'.http_build_query([
            'check_in' => StayTime::parseLocal($date, '18:00')->toIso8601String(),
            'check_out' => StayTime::parseLocal($date, '22:00')->toIso8601String(),
        ]))
            ->assertOk()
            ->assertJsonPath('data.rooms.0.available', true);
    }

    public function test_back_to_back_booking_remains_available(): void
    {
        $service = $this->makeRoomService();
        $date = now()->setTimezone(StayTime::TIMEZONE)->addDay()->toDateString();
        $this->seedBooking($service, $date, 'confirmed');

        $this->getJson('/api/services/availability?'.http_build_query([
            'check_in' => StayTime::parseLocal($date, '20:00')->toIso8601String(),
            'check_out' => StayTime::parseLocal($date, '22:00')->toIso8601String(),
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
            'check_in' => StayTime::parseLocal($date, '18:00')->toIso8601String(),
            'check_out' => StayTime::parseLocal($date, '22:00')->toIso8601String(),
        ]))
            ->assertOk()
            ->assertJsonPath('data.rooms.0.id', $room->id)
            ->assertJsonPath('data.rooms.0.available', false)
            ->assertJsonPath('data.rooms.1.id', $villa->id)
            ->assertJsonPath('data.rooms.1.available', false);
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

    private function seedBooking(Service $service, string $date, string $status): Booking
    {
        $user = User::create([
            'firstname' => 'Existing',
            'lastname' => 'Guest',
            'email' => uniqid().'@example.com',
            'password' => 'password',
            'role' => 'customer',
        ]);

        $booking = Booking::create([
            'user_id' => $user->id,
            'reference' => 'BK-'.uniqid(),
            'contact_name' => 'Existing Guest',
            'contact_email' => $user->email,
            'contact_phone' => '+639171234567',
            'check_in' => StayTime::parseLocal($date, '08:00'),
            'check_out' => StayTime::parseLocal($date, '20:00'),
            'nights' => 1,
            'adults' => 2,
            'kids' => 0,
            'subtotal' => 1500,
            'total' => 1500,
            'currency' => 'PHP',
            'status' => $status,
            'payment_method' => 'GCash',
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
