<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\Payment;
use App\Models\Service;
use App\Models\ServiceReview;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
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

        // Seed a couple of completed stays + ratings for the first room.
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
                'title' => null,
                'comment' => null,
                'status' => 'published',
            ]);

            $this->backdate($review, $checkOut);
        }

        // Give every room at least two published ratings so the rating star is
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
                    );
                }
            }
        }

        // The whole villa tile shows the same rating as its overview, so seed
        // completed stays and ratings for the exclusive service as well.
        $exclusiveService = Service::where('kind', 'exclusive')
            ->where('status', 'active')
            ->orderBy('id')
            ->first();

        if ($exclusiveService) {
            $villaReviewers = User::whereIn('email', [
                'maria.santos@demo.villacorz.test',
                'juan.delacruz@demo.villacorz.test',
                'carmen.lopez@demo.villacorz.test',
                'roberto.fernandez@demo.villacorz.test',
                'isabel.torres@demo.villacorz.test',
                'antonio.ramos@demo.villacorz.test',
            ])->get()->values();

            $villaRatings = [5, 5, 4, 5, 4, 5];

            foreach ($villaReviewers as $i => $reviewer) {
                $this->seedCompletedStay(
                    $reviewer,
                    $exclusiveService,
                    'VC-DEMO-VILLA-U' . $reviewer->id,
                    now()->subDays(9 + ($i * 3))->startOfDay(),
                    $villaRatings[$i] ?? 5,
                );
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

        // Seeded ratings stay, but photos and comments are intentionally empty
        // so real review content can be added later.
        $demoUserIds = User::whereIn('email', array_column($customers, 2))->pluck('id');

        foreach (ServiceReview::whereIn('user_id', $demoUserIds)->get() as $review) {
            foreach ($review->images as $image) {
                $path = str_replace('/storage/', '', (string) parse_url($image->image_url, PHP_URL_PATH));
                Storage::disk('public')->delete($path);
            }

            $review->images()->delete();

            if ($review->title !== null || $review->comment !== null) {
                $review->forceFill([
                    'title' => null,
                    'comment' => null,
                ])->save();
            }
        }
    }

    /**
     * Create one paid, completed stay (and optionally a rating-only review).
     * The booking reference makes the seeder safe to run more than once.
     */
    private function seedCompletedStay(
        User $user,
        Service $service,
        string $reference,
        Carbon $checkOut,
        ?int $rating = null,
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
                'title' => null,
                'comment' => null,
                'status' => 'published',
            ]);

            $this->backdate($review, $checkOut);
        }
    }

    /**
     * Date the review just after check-out so the list does not show "today".
     */
    private function backdate(ServiceReview $review, Carbon $checkOut): void
    {
        $reviewedAt = $checkOut->copy()->addDay()->setTime(10, 0);

        $review->forceFill([
            'created_at' => $reviewedAt,
            'updated_at' => $reviewedAt,
        ])->save();
    }
}
