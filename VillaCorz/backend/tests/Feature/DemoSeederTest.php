<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\CancellationRequest;
use App\Models\Payment;
use App\Models\Service;
use App\Models\ServiceImage;
use App\Models\ServiceReview;
use App\Models\ServiceReviewImage;
use App\Models\User;
use App\Support\StayPolicy;
use Database\Seeders\DemoReseedSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_reseed_populates_core_tables_with_room_reviews_and_targets_revenue(): void
    {
        $this->seedBaseline();

        $this->seed(DemoReseedSeeder::class);

        $this->assertSame(14, User::count());
        $this->assertSame(6, Service::count());
        $this->assertSame(3, ServiceImage::count());
        $this->assertSame(40, ServiceReview::count());
        $this->assertSame(0, ServiceReviewImage::count());

        foreach (Service::where('kind', 'room')->where('status', 'active')->get() as $room) {
            $reviews = ServiceReview::where('service_id', $room->id)->with('booking')->get();

            $this->assertGreaterThanOrEqual(5, $reviews->count());
            $this->assertLessThanOrEqual(10, $reviews->count());
            $this->assertTrue($reviews->every(
                fn (ServiceReview $review) => $review->rating === 5
                    && $review->status === 'published'
                    && $review->isVerified(),
            ));
        }

        foreach ([
            'bookings',
            'booking_rooms',
            'payments',
            'payment_events',
            'cancellation_requests',
            'user_phone_numbers',
            'activity_logs',
            'page_views',
            'contact_submissions',
            'scheduled_report_exports',
        ] as $table) {
            $this->assertGreaterThan(0, \DB::table($table)->count(), $table);
        }

        $this->assertGreaterThan(0, Booking::where('status', 'cancelled')->count());
        $this->assertGreaterThan(0, CancellationRequest::count());

        $paidBookings = Booking::whereNotNull('paid_days')->get();
        $this->assertGreaterThan(0, $paidBookings->count());
        foreach ($paidBookings as $booking) {
            $this->assertGreaterThanOrEqual(1, (int) $booking->paid_days);
            $this->assertSame((int) $booking->paid_days, (int) $booking->nights);
            $this->assertTrue(StayPolicy::isValidStay(
                $booking->check_in,
                $booking->check_out,
                (int) $booking->paid_days,
            ));
        }

        $revenue = (float) Payment::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [
                now()->startOfDay()->subDays(29),
                now()->endOfDay(),
            ])
            ->sum('amount');

        $this->assertGreaterThanOrEqual(120000, $revenue);
        $this->assertLessThanOrEqual(230000, $revenue);
    }

    private function seedBaseline(): void
    {
        User::forceCreate([
            'id' => 1,
            'firstname' => 'Admin',
            'lastname' => 'Account',
            'email' => 'dlord0260@gmail.com',
            'password' => 'password',
            'role' => 'admin',
            'phone_number' => '+639919602127',
        ]);

        User::forceCreate([
            'id' => 2,
            'firstname' => 'Haydee',
            'lastname' => 'Dacillo',
            'email' => 'dacillohaydee@gmail.com',
            'password' => 'password',
            'role' => 'customer',
            'phone_number' => '+639123456789',
        ]);

        $customers = [
            [3, 'Maria', 'Santos', 'maria.santos@demo.villacorz.test'],
            [4, 'Juan', 'Dela Cruz', 'juan.delacruz@demo.villacorz.test'],
            [5, 'Ana', 'Reyes', 'ana.reyes@demo.villacorz.test'],
            [6, 'Jose', 'Garcia', 'jose.garcia@demo.villacorz.test'],
            [7, 'Carmen', 'Lopez', 'carmen.lopez@demo.villacorz.test'],
            [8, 'Ricardo', 'Mendoza', 'ricardo.mendoza@demo.villacorz.test'],
            [9, 'Lourdes', 'Aquino', 'lourdes.aquino@demo.villacorz.test'],
            [10, 'Eduardo', 'Castillo', 'eduardo.castillo@demo.villacorz.test'],
            [11, 'Teresa', 'Villanueva', 'teresa.villanueva@demo.villacorz.test'],
            [12, 'Roberto', 'Fernandez', 'roberto.fernandez@demo.villacorz.test'],
            [13, 'Isabel', 'Torres', 'isabel.torres@demo.villacorz.test'],
            [14, 'Antonio', 'Ramos', 'antonio.ramos@demo.villacorz.test'],
        ];

        foreach ($customers as [$id, $first, $last, $email]) {
            User::forceCreate([
                'id' => $id,
                'firstname' => $first,
                'lastname' => $last,
                'email' => $email,
                'password' => 'password',
                'role' => 'customer',
                'email_verified_at' => now(),
            ]);
        }

        foreach ([3 => 1, 6 => 2, 7 => 3] as $id => $index) {
            $service = Service::forceCreate([
                'id' => $id,
                'name' => 'Room '.$index,
                'description' => 'Seeded room.',
                'price' => 3000,
                'weekend_price' => 3000,
                'status' => 'active',
                'kind' => 'room',
                'pax' => 2,
                'features' => [],
                'amenities' => [],
            ]);

            ServiceImage::create([
                'service_id' => $service->id,
                'image_url' => '/storage/services/room-'.$index.'.jpg',
                'public_id' => 'seed-room-'.$index,
                'is_primary' => $index === 1,
                'sort_order' => $index,
            ]);
        }

        foreach ([8 => 4, 9 => 5] as $id => $index) {
            Service::forceCreate([
                'id' => $id,
                'name' => 'Room '.$index,
                'description' => 'Seeded room.',
                'price' => 4000,
                'weekend_price' => 4000,
                'status' => 'active',
                'kind' => 'room',
                'pax' => 2,
                'features' => [],
                'amenities' => [],
            ]);
        }

        Service::forceCreate([
            'id' => 5,
            'name' => 'The Whole Villa',
            'description' => 'Seeded exclusive service.',
            'price' => 15500,
            'weekend_price' => 17000,
            'status' => 'active',
            'kind' => 'exclusive',
            'pax' => 12,
            'features' => [],
            'amenities' => [],
        ]);
    }
}
