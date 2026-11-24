<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\Service;
use App\Models\User;
use App\Support\StayPolicy;
use App\Support\StayTime;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VillaRoomConflictCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_command_cancels_future_room_conflicts_in_favor_of_the_villa(): void
    {
        $user = User::factory()->create();
        $villa = $this->makeVillaService();
        $room = $this->makeRoomService();
        $checkIn = StayTime::parseLocal(
            now()->setTimezone(StayTime::TIMEZONE)->addDays(10)->toDateString(),
            '10:00',
        );

        $villaBooking = $this->seedBooking($user, $villa, $checkIn);
        $roomBooking = $this->seedBooking($user, $room, $checkIn);

        $this->artisan('bookings:resolve-villa-room-conflicts', ['--dry-run' => true])
            ->expectsOutputToContain('1 conflicting room booking(s) would be cancelled.')
            ->assertExitCode(0);

        $this->assertSame('confirmed', $roomBooking->fresh()->status);

        $this->artisan('bookings:resolve-villa-room-conflicts')
            ->expectsOutputToContain('1 conflicting room booking(s) cancelled.')
            ->assertExitCode(0);

        $this->assertSame('confirmed', $villaBooking->fresh()->status);
        $this->assertSame('cancelled', $roomBooking->fresh()->status);
    }

    public function test_the_command_leaves_past_conflicts_untouched(): void
    {
        $user = User::factory()->create();
        $villa = $this->makeVillaService();
        $room = $this->makeRoomService();
        $checkIn = StayTime::parseLocal(
            now()->setTimezone(StayTime::TIMEZONE)->subDays(12)->toDateString(),
            '10:00',
        );

        $villaBooking = $this->seedBooking($user, $villa, $checkIn);
        $roomBooking = $this->seedBooking($user, $room, $checkIn);

        $this->artisan('bookings:resolve-villa-room-conflicts')
            ->expectsOutputToContain('0 conflicting room booking(s) cancelled.')
            ->assertExitCode(0);

        $this->assertSame('confirmed', $villaBooking->fresh()->status);
        $this->assertSame('confirmed', $roomBooking->fresh()->status);
    }

    private function seedBooking(User $user, Service $service, mixed $checkIn): Booking
    {
        $booking = Booking::create([
            'user_id' => $user->id,
            'reference' => 'VC-TEST-'.uniqid(),
            'contact_name' => 'Test Guest',
            'contact_email' => $user->email,
            'contact_phone' => '+639171234567',
            'check_in' => $checkIn,
            'check_out' => StayPolicy::checkOutFor($checkIn, 1),
            'nights' => 1,
            'paid_days' => 1,
            'adults' => 2,
            'kids' => 0,
            'subtotal' => 1500,
            'total' => 1500,
            'currency' => 'PHP',
            'status' => 'confirmed',
            'payment_method' => 'GCash',
            'confirmed_at' => now(),
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

    private function makeRoomService(): Service
    {
        return Service::create([
            'name' => 'Ocean Room',
            'description' => 'A room with an ocean view.',
            'kind' => 'room',
            'price' => 1500,
            'weekend_price' => 1800,
            'pax' => 4,
            'status' => 'active',
        ]);
    }

    private function makeVillaService(): Service
    {
        return Service::create([
            'name' => 'The Whole Villa',
            'description' => 'Entire property.',
            'kind' => 'exclusive',
            'price' => 15000,
            'weekend_price' => 18000,
            'pax' => 12,
            'status' => 'active',
        ]);
    }
}
