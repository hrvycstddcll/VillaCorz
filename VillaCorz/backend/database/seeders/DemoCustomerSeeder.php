<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\Payment;
use App\Models\Service;
use App\Models\ServiceImage;
use App\Models\ServiceReview;
use App\Models\ServiceReviewImage;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DemoCustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            ['Maria', 'Santos', 'maria.santos@demo.villacorz.test'],
            ['Juan', 'Dela Cruz', 'juan.delacruz@demo.villacorz.test'],
            ['Ana', 'Reyes', 'ana.reyes@demo.villacorz.test'],
            ['Jose', 'Garcia', 'jose.garcia@demo.villacorz.test'],
            ['Carmen', 'Lopez', 'carmen.lopez@demo.villacorz.test'],
            ['Ricardo', 'Mendoza', 'ricardo.mendoza@demo.villacorz.test'],
            ['Lourdes', 'Aquino', 'lourdes.aquino@demo.villacorz.test'],
            ['Eduardo', 'Castillo', 'eduardo.castillo@demo.villacorz.test'],
            ['Teresa', 'Villanueva', 'teresa.villanueva@demo.villacorz.test'],
            ['Roberto', 'Fernandez', 'roberto.fernandez@demo.villacorz.test'],
            ['Isabel', 'Torres', 'isabel.torres@demo.villacorz.test'],
            ['Antonio', 'Ramos', 'antonio.ramos@demo.villacorz.test'],
        ];

        foreach ($customers as [$first, $last, $email]) {
            User::firstOrCreate(
                ['email' => $email],
                [
                    'firstname' => $first,
                    'lastname' => $last,
                    'password' => bcrypt('password'),
                    'role' => 'customer',
                    'email_verified_at' => now(),
                ],
            );
        }

        // Seed a couple of completed stays + reviews for demo visibility.
        $service = Service::where('kind', 'room')->orderBy('id')->first();
        if (! $service) {
            return;
        }

        $reviewers = User::whereIn('email', [
            'maria.santos@demo.villacorz.test',
            'ana.reyes@demo.villacorz.test',
            'carmen.lopez@demo.villacorz.test',
            'teresa.villanueva@demo.villacorz.test',
        ])->get();

        $reviewTexts = [
            'Loved the beach view and the cozy rooms. Staff were warm and helpful.',
            'Great value for the price. The villa felt like home. Will come back!',
            'Clean, comfortable, and peaceful. Perfect for a weekend getaway.',
            'Beautiful property and friendly hosts. Highly recommended.',
        ];

        $reviewTitles = [
            'Perfect weekend escape',
            'Feels like home',
            'Spotless and peaceful',
            'Warm hosts, lovely place',
        ];

        $ratings = [5, 4, 5, 4];

        foreach ($reviewers as $i => $user) {
            $checkIn = now()->subDays(40 + ($i * 5))->startOfDay();
            $checkOut = $checkIn->copy()->addDays(2);

            // Skip if this user already has a review for this service.
            if (ServiceReview::where('user_id', $user->id)->where('service_id', $service->id)->exists()) {
                continue;
            }

            $booking = Booking::create([
                'user_id' => $user->id,
                'reference' => 'VC-DEMO-' . strtoupper(Str::random(6)),
                'contact_name' => trim($user->firstname . ' ' . $user->lastname),
                'contact_email' => $user->email,
                'contact_phone' => null,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'nights' => 2,
                'adults' => 2,
                'kids' => 0,
                'subtotal' => (float) $service->price * 2,
                'total' => (float) $service->price * 2,
                'currency' => 'PHP',
                'status' => 'confirmed',
                'payment_method' => 'GCash',
                'confirmed_at' => $checkIn->copy()->subDays(10),
                'completed_at' => $checkOut,
            ]);

            BookingRoom::create([
                'booking_id' => $booking->id,
                'service_id' => $service->id,
                'service_name' => $service->name,
                'kind' => $service->kind,
                'adults' => 2,
                'kids' => 0,
                'weekday_price' => $service->price,
                'weekend_price' => $service->weekend_price ?? $service->price,
                'line_total' => (float) $service->price * 2,
            ]);

            $token = Str::random(32);
            Payment::create([
                'booking_id' => $booking->id,
                'reference' => 'PAY-' . strtoupper(bin2hex(random_bytes(4))),
                'provider' => 'demo',
                'method' => 'GCash',
                'amount' => $service->price * 2,
                'currency' => 'PHP',
                'status' => 'paid',
                'idempotency_key' => Str::uuid()->toString(),
                'qr_token_hash' => hash('sha256', $token),
                'qr_url' => rtrim((string) config('payments.public_url'), '/') . '/pay/' . $token,
                'qr_expires_at' => now()->addHour(),
                'paid_at' => $checkIn->copy()->subDays(10),
            ]);

            $review = ServiceReview::create([
                'service_id' => $service->id,
                'user_id' => $user->id,
                'booking_id' => $booking->id,
                'rating' => $ratings[$i] ?? 5,
                'title' => $reviewTitles[$i] ?? null,
                'comment' => $reviewTexts[$i] ?? 'Great stay!',
                'status' => 'published',
            ]);

            $review->forceFill([
                'created_at' => $checkOut->copy()->addDay()->setTime(10, 0),
                'updated_at' => $checkOut->copy()->addDay()->setTime(10, 0),
            ])->save();
        }

        // Give every room at least two published reviews so the rating star is
        // visible on each tile on the /services page, not just the first room.
        $otherRooms = Service::where('kind', 'room')
            ->where('id', '!=', $service->id)
            ->orderBy('id')
            ->get();

        $otherReviewers = User::whereIn('email', [
            'juan.delacruz@demo.villacorz.test',
            'jose.garcia@demo.villacorz.test',
            'ricardo.mendoza@demo.villacorz.test',
            'lourdes.aquino@demo.villacorz.test',
            'eduardo.castillo@demo.villacorz.test',
            'roberto.fernandez@demo.villacorz.test',
            'isabel.torres@demo.villacorz.test',
            'antonio.ramos@demo.villacorz.test',
        ])->get()->values();

        $extraComments = [
            'Spacious room and very clean. The air conditioning worked great.',
            'Quiet at night and just a short walk to the beach. Would stay again.',
            'Comfortable beds and helpful staff. Good value for the price.',
            'The room was tidy and the view was lovely. Enjoyed our stay.',
            'Easy check-in and a relaxing atmosphere. Recommended.',
            'Plenty of space for the family and the kids loved it.',
            'Bright, airy, and close to everything we needed.',
            'Peaceful stay with friendly hosts. We will be back.',
        ];
        $extraTitles = [
            'Clean and spacious',
            'Quiet and close to the beach',
            'Comfortable beds',
            'Lovely view',
            'Easy check-in',
            'Great for families',
            'Bright and airy',
            'Peaceful stay',
        ];
        $extraRatings = [4, 5, 5, 4, 5, 4, 5, 4];

        if ($otherRooms->isNotEmpty() && $otherReviewers->isNotEmpty()) {
            $index = 0;

            foreach ($otherRooms as $room) {
                foreach ([0, 1] as $slot) {
                    $reviewer = $otherReviewers->get($index);
                    $index++;

                    if (! $reviewer) {
                        continue;
                    }

                    $this->seedCompletedStay(
                        $reviewer,
                        $room,
                        'VC-DEMO-R' . $room->id . '-U' . $reviewer->id,
                        now()->subDays(10 + ($slot * 4))->startOfDay(),
                        $extraRatings[$index - 1] ?? 5,
                        $extraComments[$index - 1] ?? 'A comfortable stay.',
                        $extraTitles[$index - 1] ?? null,
                    );
                }
            }
        }

        // Give Haydee Dacillo a recent completed stay on the first room so she
        // can try the review flow from her own customer account. No review is
        // created, so the "Write a review" form stays available to her.
        $haydee = User::where('email', 'dacillohaydee@gmail.com')->first();

        if ($haydee) {
            $this->seedCompletedStay(
                $haydee,
                $service,
                'VC-DEMO-HAYDEE-R' . $service->id,
                now()->subDays(5)->startOfDay(),
            );
        }

        // Backfill seeded reviews with a title and a demo photo so the review
        // cards show real content (text + imagery) instead of text only. This
        // also upgrades reviews created by earlier seeder runs.
        $demoUserIds = User::whereIn('email', array_column($customers, 2))->pluck('id');
        $photoGroups = ServiceImage::query()
            ->whereNotNull('image_url')
            ->orderBy('id')
            ->get()
            ->groupBy('service_id');
        $photos = $photoGroups->flatten()->pluck('image_url')->filter()->values();

        if ($photos->isEmpty()) {
            return;
        }

        $seededReviews = ServiceReview::query()
            ->whereIn('user_id', $demoUserIds)
            ->orderBy('id')
            ->get();

        $titleByComment = array_combine(
            array_merge($reviewTexts, $extraComments),
            array_merge($reviewTitles, $extraTitles),
        );

        foreach ($seededReviews as $index => $review) {
            $title = $titleByComment[$review->comment ?? ''] ?? null;

            if ($title !== null && $review->title !== $title) {
                $review->update(['title' => $title]);
            }

            // Keep review dates close to the stay instead of "today".
            if ($review->booking?->check_out) {
                $reviewedAt = $review->booking->check_out->copy()->addDay()->setTime(10, 0);

                if (! $review->created_at?->equalTo($reviewedAt)) {
                    $review->forceFill([
                        'created_at' => $reviewedAt,
                        'updated_at' => $reviewedAt,
                    ])->save();
                }
            }

            if ($review->images()->doesntExist()) {
                $servicePhotos = $photoGroups->get($review->service_id);
                $imageUrl = $servicePhotos
                    ? $servicePhotos[$index % $servicePhotos->count()]->image_url
                    : $photos[$index % $photos->count()];

                ServiceReviewImage::create([
                    'service_review_id' => $review->id,
                    'image_url' => $imageUrl,
                    'public_id' => null,
                    'sort_order' => 0,
                ]);
            }
        }
    }

    /**
     * Create one paid, completed stay (and optionally a published review).
     * The booking reference makes the seeder safe to run more than once.
     */
    private function seedCompletedStay(
        User $user,
        Service $service,
        string $reference,
        Carbon $checkOut,
        ?int $rating = null,
        ?string $comment = null,
        ?string $title = null,
    ): void {
        if (Booking::where('reference', $reference)->exists()) {
            return;
        }

        $checkIn = $checkOut->copy()->subDays(2);

        $booking = Booking::create([
            'user_id' => $user->id,
            'reference' => $reference,
            'contact_name' => trim($user->firstname . ' ' . $user->lastname),
            'contact_email' => $user->email,
            'contact_phone' => null,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'nights' => 2,
            'adults' => 2,
            'kids' => 0,
            'subtotal' => (float) $service->price * 2,
            'total' => (float) $service->price * 2,
            'currency' => 'PHP',
            'status' => 'confirmed',
            'payment_method' => 'GCash',
            'confirmed_at' => $checkIn->copy()->subDays(10),
            'completed_at' => $checkOut,
        ]);

        BookingRoom::create([
            'booking_id' => $booking->id,
            'service_id' => $service->id,
            'service_name' => $service->name,
            'kind' => $service->kind,
            'adults' => 2,
            'kids' => 0,
            'weekday_price' => $service->price,
            'weekend_price' => $service->weekend_price ?? $service->price,
            'line_total' => (float) $service->price * 2,
        ]);

        $token = Str::random(32);
        Payment::create([
            'booking_id' => $booking->id,
            'reference' => 'PAY-' . $reference,
            'provider' => 'demo',
            'method' => 'GCash',
            'amount' => (float) $service->price * 2,
            'currency' => 'PHP',
            'status' => 'paid',
            'idempotency_key' => 'demo-' . strtolower($reference),
            'qr_token_hash' => hash('sha256', $token),
            'qr_url' => rtrim((string) config('payments.public_url'), '/') . '/pay/' . $token,
            'qr_expires_at' => now()->addHour(),
            'paid_at' => $checkIn->copy()->subDays(10),
        ]);

        if ($rating !== null) {
            $review = ServiceReview::create([
                'service_id' => $service->id,
                'user_id' => $user->id,
                'booking_id' => $booking->id,
                'rating' => $rating,
                'title' => $title,
                'comment' => $comment,
                'status' => 'published',
            ]);

            $review->forceFill([
                'created_at' => $checkOut->copy()->addDay()->setTime(10, 0),
                'updated_at' => $checkOut->copy()->addDay()->setTime(10, 0),
            ])->save();
        }
    }
}
