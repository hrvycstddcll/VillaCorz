<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\Service;
use App\Models\ServiceReview;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoReviewSeeder extends Seeder
{
    private const REVIEWS_PER_ROOM = 8;

    private const COMMENTS = [
        ['A quiet escape by the sea', 'The room was spotless and the sound of the waves made every night feel peaceful. We would happily stay again.'],
        ['Thoughtful details everywhere', 'Everything we needed was already prepared. The bed was comfortable, the space was calm, and the check-in was effortless.'],
        ['Perfect for a slow weekend', 'We loved waking up to the sea breeze and having coffee just steps from the shore. It felt private and restorative.'],
        ['Warm and welcoming stay', 'The team made us feel at home from arrival to checkout. The room was clean, bright, and exactly as described.'],
        ['Better than expected', 'The photos do not do the place justice. It was quiet, spacious, and close to everything we wanted to see.'],
        ['A memorable family stay', 'Our family had plenty of room to relax, and the location made it easy to spend the whole day by the water.'],
        ['Clean, comfortable, and serene', 'The room was beautifully maintained and the surroundings were peaceful. It was the reset we needed.'],
        ['Would book again', 'Great value for the location and comfort. Everything was simple, smooth, and genuinely enjoyable.'],
        ['A peaceful coastal hideaway', 'We appreciated how quiet the room was at night. Falling asleep to the ocean was the highlight of our trip.'],
        ['Exactly what we hoped for', 'Comfortable beds, a spotless bathroom, and a short walk to the beach. We left already planning our next visit.'],
    ];

    public function run(): void
    {
        $rooms = Service::where('kind', 'room')
            ->where('status', 'active')
            ->orderBy('id')
            ->get();

        $customers = User::where('email', 'like', '%@demo.villacorz.test')
            ->orderBy('id')
            ->get()
            ->values();

        if ($rooms->isEmpty() || $customers->isEmpty()) {
            return;
        }

        foreach ($rooms as $roomIndex => $room) {
            for ($slot = 0; $slot < self::REVIEWS_PER_ROOM; $slot++) {
                $customer = $customers->get(($roomIndex * 3 + $slot) % $customers->count());

                if (! $customer) {
                    continue;
                }

                $checkOut = now()->subDays(6 + ($slot * 3))->startOfDay();
                $checkIn = $checkOut->copy()->subDays(2);
                $reference = 'VC-REVIEW-R'.$room->id.'-U'.$customer->id;

                $booking = Booking::firstOrCreate(
                    ['reference' => $reference],
                    [
                        'user_id' => $customer->id,
                        'contact_name' => trim($customer->firstname.' '.$customer->lastname),
                        'contact_email' => $customer->email,
                        'contact_phone' => null,
                        'check_in' => $checkIn,
                        'check_out' => $checkOut,
                        'nights' => 2,
                        'adults' => 2,
                        'kids' => 0,
                        'subtotal' => (float) $room->price * 2,
                        'total' => (float) $room->price * 2,
                        'currency' => 'PHP',
                        'status' => 'confirmed',
                        'payment_method' => 'GCash',
                        'confirmed_at' => $checkIn->copy()->subDays(4),
                        'completed_at' => $checkOut,
                    ],
                );

                BookingRoom::firstOrCreate(
                    [
                        'booking_id' => $booking->id,
                        'service_id' => $room->id,
                    ],
                    [
                        'service_name' => $room->name,
                        'kind' => $room->kind,
                        'adults' => 2,
                        'kids' => 0,
                        'weekday_price' => $room->price,
                        'weekend_price' => $room->weekend_price ?? $room->price,
                        'line_total' => (float) $room->price * 2,
                    ],
                );

                [$title, $comment] = self::COMMENTS[($roomIndex + $slot) % count(self::COMMENTS)];
                $review = ServiceReview::updateOrCreate(
                    [
                        'user_id' => $customer->id,
                        'service_id' => $room->id,
                    ],
                    [
                        'booking_id' => $booking->id,
                        'rating' => 5,
                        'title' => $title,
                        'comment' => $comment,
                        'status' => 'published',
                    ],
                );

                $createdAt = $checkOut->copy()->addDay()->setTime(10, 0);
                ServiceReview::whereKey($review->id)->update([
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }
        }
    }
}
