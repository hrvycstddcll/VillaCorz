<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\Payment;
use App\Models\Service;
use App\Models\User;
use App\Support\StayPolicy;
use App\Support\StayTime;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

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

        // Seed completed stays for the first room. Reviews are intentionally
        // excluded; the stays still support reports and the churn drill-down.
        $service = Service::where('kind', 'room')->orderBy('id')->first();
        if (! $service) {
            return;
        }

        $reviewers = User::whereIn('email', [
            'maria.santos@demo.villacorz.test',
            'ana.reyes@demo.villacorz.test',
            'carmen.lopez@demo.villacorz.test',
            'teresa.villanueva@demo.villacorz.test',
        ])->orderBy('id')->get();

        foreach ($reviewers as $i => $user) {
            $paidDays = 2;
            $checkIn = StayTime::parseLocal(
                now()->subDays(40 + ($i * 5))->toDateString(),
                StayPolicy::defaultCheckInTime(),
            );
            $checkOut = StayPolicy::checkOutFor($checkIn, $paidDays);
            $total = $this->stayTotal($service, $checkIn, $paidDays);
            $reference = 'VC-DEMO-R'.$service->id.'-U'.$user->id;

            if (Booking::where('reference', $reference)->exists()) {
                continue;
            }

            $booking = Booking::create([
                'user_id' => $user->id,
                'reference' => $reference,
                'contact_name' => trim($user->firstname.' '.$user->lastname),
                'contact_email' => $user->email,
                'contact_phone' => null,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'paid_days' => $paidDays,
                'nights' => $paidDays,
                'adults' => 2,
                'kids' => 0,
                'subtotal' => $total,
                'total' => $total,
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
                'line_total' => $total,
            ]);

            $token = 'seed-demo-token-'.strtolower($reference);
            Payment::create([
                'booking_id' => $booking->id,
                'reference' => 'PAY-'.$reference,
                'provider' => 'demo',
                'method' => 'GCash',
                'amount' => $total,
                'currency' => 'PHP',
                'status' => 'paid',
                'idempotency_key' => 'demo-'.strtolower($reference),
                'qr_token_hash' => hash('sha256', $token),
                'qr_url' => rtrim((string) config('payments.public_url'), '/').'/pay/'.$token,
                'qr_expires_at' => now()->addHour(),
                'paid_at' => $checkIn->copy()->subDays(10),
            ]);
        }

        // Seed two completed stays for every other room.
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
        ])->orderBy('id')->get()->values();

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
                        'VC-DEMO-R'.$room->id.'-U'.$reviewer->id,
                        now()->subDays(10 + ($slot * 4))->startOfDay(),
                    );
                }
            }
        }

        // Seed completed whole-villa stays for the exclusive service.
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
            ])->orderBy('id')->get()->values();

            foreach ($villaReviewers as $i => $reviewer) {
                $this->seedCompletedStay(
                    $reviewer,
                    $exclusiveService,
                    'VC-DEMO-VILLA-U'.$reviewer->id,
                    now()->subDays(9 + ($i * 3))->startOfDay(),
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
                'VC-DEMO-HAYDEE-R'.$service->id,
                now()->subDays(5)->startOfDay(),
            );
        }

    }

    /**
     * Create one paid, completed stay. The booking reference makes the seeder
     * safe to run more than once.
     */
    private function seedCompletedStay(
        User $user,
        Service $service,
        string $reference,
        Carbon $checkOutDate,
    ): void {
        if (Booking::where('reference', $reference)->exists()) {
            return;
        }

        $paidDays = 2;
        $checkIn = StayTime::parseLocal(
            $checkOutDate->copy()->subDays($paidDays)->toDateString(),
            StayPolicy::defaultCheckInTime(),
        );
        $checkOut = StayPolicy::checkOutFor($checkIn, $paidDays);
        $total = $this->stayTotal($service, $checkIn, $paidDays);

        $booking = Booking::create([
            'user_id' => $user->id,
            'reference' => $reference,
            'contact_name' => trim($user->firstname.' '.$user->lastname),
            'contact_email' => $user->email,
            'contact_phone' => null,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'paid_days' => $paidDays,
            'nights' => $paidDays,
            'adults' => 2,
            'kids' => 0,
            'subtotal' => $total,
            'total' => $total,
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
            'line_total' => $total,
        ]);

        $token = 'seed-demo-token-'.strtolower($reference);
        Payment::create([
            'booking_id' => $booking->id,
            'reference' => 'PAY-'.$reference,
            'provider' => 'demo',
            'method' => 'GCash',
            'amount' => $total,
            'currency' => 'PHP',
            'status' => 'paid',
            'idempotency_key' => 'demo-'.strtolower($reference),
            'qr_token_hash' => hash('sha256', $token),
            'qr_url' => rtrim((string) config('payments.public_url'), '/').'/pay/'.$token,
            'qr_expires_at' => now()->addHour(),
            'paid_at' => $checkIn->copy()->subDays(10),
        ]);

    }

    private function stayTotal(Service $service, mixed $checkIn, int $paidDays): float
    {
        $weekdayPrice = (float) $service->price;
        $weekendPrice = (float) ($service->weekend_price ?? $service->price);
        $total = 0.0;

        foreach (StayPolicy::windows($checkIn, $paidDays) as $window) {
            $total += $window['is_weekend'] ? $weekendPrice : $weekdayPrice;
        }

        return round($total, 2);
    }
}
