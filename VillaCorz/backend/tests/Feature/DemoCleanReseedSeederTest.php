<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Service;
use App\Models\ServiceImage;
use App\Models\ServiceReview;
use App\Models\ServiceReviewImage;
use App\Models\User;
use App\Support\StayPolicy;
use App\Support\StayTime;
use Database\Seeders\DemoCleanReseedSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoCleanReseedSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_clean_reseed_preserves_reviews_and_accounts_while_refreshing_demo_tables(): void
    {
        $this->seedBaseline();
        $this->seedReviews();

        $usersBefore = User::orderBy('id')->pluck('id')->all();
        $servicesBefore = Service::orderBy('id')->pluck('id')->all();
        $serviceImagesBefore = ServiceImage::orderBy('id')->pluck('id')->all();
        $reviewsBefore = $this->reviewSnapshot();
        $imagesBefore = ServiceReviewImage::orderBy('id')->pluck('id')->all();

        $this->seed(DemoCleanReseedSeeder::class);

        $this->assertSame($usersBefore, User::orderBy('id')->pluck('id')->all());
        $this->assertSame($servicesBefore, Service::orderBy('id')->pluck('id')->all());
        $this->assertSame($serviceImagesBefore, ServiceImage::orderBy('id')->pluck('id')->all());
        $this->assertSame($reviewsBefore, $this->reviewSnapshot());
        $this->assertSame($imagesBefore, ServiceReviewImage::orderBy('id')->pluck('id')->all());

        foreach (ServiceReview::with('booking')->get() as $review) {
            $this->assertTrue($review->isVerified());
            $booking = $review->booking;
            $this->assertNotNull($booking);
            $this->assertNotNull($booking->paid_days);
            $this->assertTrue(StayPolicy::isValidStay(
                $booking->check_in,
                $booking->check_out,
                (int) $booking->paid_days,
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
            $this->assertGreaterThan(0, DB::table($table)->count(), $table);
        }

        $revenue = (float) DB::table('payments')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [
                now()->startOfDay()->subDays(29),
                now()->endOfDay(),
            ])
            ->sum('amount');

        $this->assertGreaterThanOrEqual(135000, $revenue);
        $this->assertLessThanOrEqual(150000, $revenue);
    }

    private function reviewSnapshot(): array
    {
        return ServiceReview::orderBy('id')
            ->get()
            ->map(fn (ServiceReview $review) => [
                'id' => $review->id,
                'service_id' => $review->service_id,
                'user_id' => $review->user_id,
                'rating' => $review->rating,
                'title' => $review->title,
                'comment' => $review->comment,
                'status' => $review->status,
                'created_at' => $review->created_at?->toDateTimeString(),
                'updated_at' => $review->updated_at?->toDateTimeString(),
            ])
            ->all();
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
            'email_verified_at' => now(),
        ]);

        User::forceCreate([
            'id' => 2,
            'firstname' => 'Haydee',
            'lastname' => 'Dacillo',
            'email' => 'dacillohaydee@gmail.com',
            'password' => 'password',
            'role' => 'customer',
            'phone_number' => '+639123456789',
            'email_verified_at' => now(),
        ]);

        $customers = [
            'Maria Santos',
            'Juan Dela Cruz',
            'Ana Reyes',
            'Jose Garcia',
            'Carmen Lopez',
            'Ricardo Mendoza',
            'Lourdes Aquino',
            'Eduardo Castillo',
            'Teresa Villanueva',
            'Roberto Fernandez',
            'Isabel Torres',
            'Antonio Ramos',
        ];
        $emails = [
            'maria.santos@demo.villacorz.test',
            'juan.delacruz@demo.villacorz.test',
            'ana.reyes@demo.villacorz.test',
            'jose.garcia@demo.villacorz.test',
            'carmen.lopez@demo.villacorz.test',
            'ricardo.mendoza@demo.villacorz.test',
            'lourdes.aquino@demo.villacorz.test',
            'eduardo.castillo@demo.villacorz.test',
            'teresa.villanueva@demo.villacorz.test',
            'roberto.fernandez@demo.villacorz.test',
            'isabel.torres@demo.villacorz.test',
            'antonio.ramos@demo.villacorz.test',
        ];

        foreach ($customers as $index => $name) {
            [$firstname, $lastname] = explode(' ', $name, 2);

            User::forceCreate([
                'id' => $index + 3,
                'firstname' => $firstname,
                'lastname' => $lastname,
                'email' => $emails[$index],
                'password' => 'password',
                'role' => 'customer',
                'email_verified_at' => now(),
            ]);
        }

        foreach ([3 => 1, 6 => 2, 7 => 3, 8 => 4, 9 => 5] as $id => $number) {
            Service::forceCreate([
                'id' => $id,
                'name' => 'Room '.$number,
                'description' => 'Seeded room.',
                'price' => $number >= 4 ? 4000 : 3000,
                'weekend_price' => $number >= 4 ? 4000 : 3000,
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

        ServiceImage::forceCreate([
            'id' => 1,
            'service_id' => 3,
            'image_url' => '/storage/services/room-1.jpg',
            'public_id' => 'seed-room-1',
            'is_primary' => true,
            'sort_order' => 1,
        ]);
    }

    private function seedReviews(): void
    {
        foreach ([3 => 3, 6 => 4] as $serviceId => $userId) {
            $paidDays = 2;
            $checkIn = StayTime::parseLocal(
                now()->subDays(10 + $serviceId)->subDays($paidDays)->toDateString(),
                StayPolicy::defaultCheckInTime(),
            );
            $checkOut = StayPolicy::checkOutFor($checkIn, $paidDays);

            $booking = Booking::forceCreate([
                'user_id' => $userId,
                'reference' => 'VC-REVIEW-R'.$serviceId.'-U'.$userId,
                'contact_name' => 'Seeded Reviewer',
                'contact_email' => User::findOrFail($userId)->email,
                'contact_phone' => null,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'paid_days' => $paidDays,
                'nights' => $paidDays,
                'adults' => 2,
                'kids' => 0,
                'subtotal' => 6000,
                'total' => 6000,
                'currency' => 'PHP',
                'status' => 'confirmed',
                'payment_method' => 'GCash',
                'confirmed_at' => $checkIn->copy()->subDays(2),
                'completed_at' => $checkOut,
                'created_at' => $checkIn->copy()->subDays(3),
                'updated_at' => $checkIn->copy()->subDays(3),
            ]);

            $review = ServiceReview::forceCreate([
                'service_id' => $serviceId,
                'user_id' => $userId,
                'booking_id' => $booking->id,
                'rating' => 5,
                'title' => 'Preserved review '.$serviceId,
                'comment' => 'This review content must survive a clean reseed.',
                'status' => 'published',
                'created_at' => $checkOut->copy()->addDay(),
                'updated_at' => $checkOut->copy()->addDay(),
            ]);

            ServiceReviewImage::forceCreate([
                'service_review_id' => $review->id,
                'image_url' => 'https://example.test/review-'.$serviceId.'.jpg',
                'public_id' => 'seed-review-'.$serviceId,
                'sort_order' => 1,
            ]);
        }
    }
}
