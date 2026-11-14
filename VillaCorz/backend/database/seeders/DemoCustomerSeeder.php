<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\Payment;
use App\Models\Service;
use App\Models\ServiceReview;
use App\Models\User;
use Illuminate\Database\Seeder;
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

            ServiceReview::create([
                'service_id' => $service->id,
                'user_id' => $user->id,
                'booking_id' => $booking->id,
                'rating' => $ratings[$i] ?? 5,
                'title' => null,
                'comment' => $reviewTexts[$i] ?? 'Great stay!',
                'status' => 'published',
            ]);
        }
    }
}
