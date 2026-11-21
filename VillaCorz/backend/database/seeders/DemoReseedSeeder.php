<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\CancellationRequest;
use App\Models\ContactSubmission;
use App\Models\PageView;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\ScheduledReportExport;
use App\Models\Service;
use App\Models\ServiceReview;
use App\Models\ServiceReviewImage;
use App\Models\User;
use App\Models\UserPhoneNumber;
use App\Support\StayPolicy;
use App\Support\StayTime;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class DemoReseedSeeder extends Seeder
{
    public function run(): void
    {
        $this->resetData();
        $this->call(DemoCustomerSeeder::class);
        $this->call(DemoReviewSeeder::class);
        $this->call(DemoDemandSeeder::class);
        $this->call(DemoAnalyticsSeeder::class);
        $this->seedOperationalData();
    }

    private function resetData(): void
    {
        ScheduledReportExport::query()->delete();
        CancellationRequest::query()->delete();
        PaymentEvent::query()->delete();
        Payment::query()->delete();
        BookingRoom::query()->delete();
        Booking::query()->delete();
        ActivityLog::query()->delete();
        ContactSubmission::query()->delete();
        PageView::query()->delete();
        UserPhoneNumber::query()->delete();
        ServiceReviewImage::query()->delete();
        ServiceReview::query()->delete();
    }

    protected function seedOperationalData(): void
    {
        $admin = User::where('email', 'dlord0260@gmail.com')->firstOrFail();
        $haydee = User::where('email', 'dacillohaydee@gmail.com')->firstOrFail();
        $customers = User::where('email', 'like', '%@demo.villacorz.test')
            ->orderBy('id')
            ->get();

        $this->seedPhoneNumbers($admin, $haydee);
        $this->seedCancelledBookings($customers);
        $this->seedPendingBookings($customers);
        $this->seedPaymentEvents();
        $this->seedActivityLogs($admin, $customers);
        $this->seedContactSubmissions();
        $this->seedScheduledReports($admin);
    }

    private function seedPhoneNumbers(User $admin, User $haydee): void
    {
        UserPhoneNumber::create([
            'user_id' => $haydee->id,
            'phone_number' => '+639123456789',
            'is_primary' => true,
            'verified_at' => null,
            'created_at' => '2026-11-13 06:46:42',
            'updated_at' => '2026-11-13 06:46:42',
        ]);

        UserPhoneNumber::create([
            'user_id' => $admin->id,
            'phone_number' => '+639919602127',
            'is_primary' => true,
            'verified_at' => '2026-11-13 07:34:21',
            'created_at' => '2026-11-13 07:33:39',
            'updated_at' => '2026-11-13 07:34:21',
        ]);
    }

    private function seedCancelledBookings(Collection $customers): void
    {
        $service = Service::where('kind', 'room')->orderBy('id')->firstOrFail();

        foreach ([1, 2, 3, 4] as $slot) {
            $customer = $customers[($slot - 1) % $customers->count()];
            $createdAt = now()->subDays(2 + ($slot * 2))->setTime(9 + $slot, 15);
            $paidDays = 2;
            $checkIn = StayTime::parseLocal(
                $createdAt->copy()->addDays(7)->toDateString(),
                StayPolicy::defaultCheckInTime(),
            );
            $checkOut = StayPolicy::checkOutFor($checkIn, $paidDays);
            $reference = 'VC-DEMO-CANCEL-'.str_pad((string) $slot, 2, '0', STR_PAD_LEFT);
            $total = $this->stayTotal($service, $checkIn, $paidDays);

            $booking = Booking::create([
                'user_id' => $customer->id,
                'reference' => $reference,
                'contact_name' => trim($customer->firstname.' '.$customer->lastname),
                'contact_email' => $customer->email,
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
                'status' => 'cancelled',
                'payment_method' => 'GCash',
            ]);
            $booking->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ])->saveQuietly();

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

            $token = 'seed-cancel-token-'.$slot;
            $payment = Payment::create([
                'booking_id' => $booking->id,
                'reference' => 'PAY-'.$reference,
                'provider' => 'demo',
                'method' => 'GCash',
                'amount' => $total,
                'currency' => 'PHP',
                'status' => 'cancelled',
                'idempotency_key' => 'demo-cancel-payment-'.$slot,
                'qr_token_hash' => hash('sha256', $token),
                'qr_url' => rtrim((string) config('payments.public_url'), '/').'/pay/'.$token,
                'qr_expires_at' => $createdAt->copy()->addHour(),
                'paid_at' => null,
            ]);
            $payment->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ])->saveQuietly();

            $request = CancellationRequest::create([
                'booking_id' => $booking->id,
                'user_id' => $customer->id,
                'reason' => [
                    'Change of travel dates.',
                    'Guest requested a refund.',
                    'Duplicate reservation.',
                    'Schedule conflict with another booking.',
                ][$slot - 1],
                'status' => 'pending',
            ]);
            $requestedAt = $createdAt->copy()->addDay();
            $request->forceFill([
                'created_at' => $requestedAt,
                'updated_at' => $requestedAt,
            ])->saveQuietly();
        }
    }

    private function seedPendingBookings(Collection $customers): void
    {
        $service = Service::where('kind', 'room')->orderBy('id')->firstOrFail();

        foreach ([1, 2] as $slot) {
            $customer = $customers[($slot + 2) % $customers->count()];
            $createdAt = now()->subDays($slot + 1)->setTime(14 + $slot, 30);
            $paidDays = 2;
            $checkIn = StayTime::parseLocal(
                now()->addDays(8 + $slot)->toDateString(),
                StayPolicy::defaultCheckInTime(),
            );
            $checkOut = StayPolicy::checkOutFor($checkIn, $paidDays);
            $reference = 'VC-DEMO-PENDING-'.str_pad((string) $slot, 2, '0', STR_PAD_LEFT);
            $total = $this->stayTotal($service, $checkIn, $paidDays);

            $booking = Booking::create([
                'user_id' => $customer->id,
                'reference' => $reference,
                'contact_name' => trim($customer->firstname.' '.$customer->lastname),
                'contact_email' => $customer->email,
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
                'status' => 'pending_payment',
                'payment_method' => 'GCash',
                'expires_at' => $createdAt->copy()->addHour(),
            ]);
            $booking->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ])->saveQuietly();

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

            $token = 'seed-pending-token-'.$slot;
            $payment = Payment::create([
                'booking_id' => $booking->id,
                'reference' => 'PAY-'.$reference,
                'provider' => 'demo',
                'method' => 'GCash',
                'amount' => $total,
                'currency' => 'PHP',
                'status' => 'pending',
                'idempotency_key' => 'demo-pending-payment-'.$slot,
                'qr_token_hash' => hash('sha256', $token),
                'qr_url' => rtrim((string) config('payments.public_url'), '/').'/pay/'.$token,
                'qr_expires_at' => $createdAt->copy()->addHour(),
                'paid_at' => null,
            ]);
            $payment->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ])->saveQuietly();
        }
    }

    private function seedPaymentEvents(): void
    {
        $payments = Payment::with('booking')->orderBy('id')->get();

        foreach ($payments as $payment) {
            $base = $payment->created_at ? Carbon::parse($payment->created_at) : now();
            $events = [
                ['booking_created', 'user', ['reference' => $payment->booking?->reference ?? $payment->reference]],
                ['payment_created', 'user', ['method' => $payment->method, 'reference' => $payment->reference]],
                ['qr_issued', 'system', ['expires_at' => $payment->qr_expires_at?->toIso8601String()]],
            ];

            if ($payment->status === 'paid') {
                $events[] = ['payment_paid', 'system', ['amount' => (string) $payment->amount]];
            } elseif ($payment->status === 'cancelled') {
                $events[] = ['booking_cancelled', 'user', ['previous_status' => 'confirmed']];
            }

            foreach ($events as $index => [$event, $actor, $metadata]) {
                PaymentEvent::create([
                    'booking_id' => $payment->booking_id,
                    'payment_id' => $payment->id,
                    'event' => $event,
                    'actor' => $actor,
                    'idempotency_key' => 'seed-event-'.$payment->id.'-'.$index,
                    'metadata' => $metadata,
                    'ip_address' => '127.0.0.1',
                    'user_agent' => 'DemoReseedSeeder',
                    'created_at' => $base->copy()->addMinutes($index),
                ]);
            }
        }
    }

    private function seedActivityLogs(User $admin, Collection $customers): void
    {
        $actions = ['login', 'registered', 'created', 'updated', 'logout', 'login_failed'];

        for ($i = 0; $i < 60; $i++) {
            $user = $i % 6 === 0 ? $admin : $customers[$i % $customers->count()];
            $createdAt = now()->subDays($i % 45)->setTime(7 + ($i % 12), ($i * 7) % 60);

            ActivityLog::create([
                'user_id' => $user->id,
                'action' => $actions[$i % count($actions)],
                'subject_type' => $i % 2 === 0 ? Booking::class : User::class,
                'subject_id' => $user->id,
                'description' => 'Seeded administrator activity.',
                'properties' => ['seed' => true, 'slot' => $i + 1],
                'ip_address' => '127.0.0.1',
                'user_agent' => 'DemoReseedSeeder',
                'created_at' => $createdAt,
            ]);
        }
    }

    private function seedContactSubmissions(): void
    {
        $messages = [
            ['Juan Dela Cruz', 'juan.delacruz@demo.villacorz.test', 'Do you have availability next weekend?'],
            ['Maria Santos', 'maria.santos@demo.villacorz.test', 'Can I request an early check-in?'],
            ['Ana Reyes', 'ana.reyes@demo.villacorz.test', 'Is parking available on site?'],
            ['Jose Garcia', 'jose.garcia@demo.villacorz.test', 'Do you offer long-stay discounts?'],
            ['Carmen Lopez', 'carmen.lopez@demo.villacorz.test', 'Please send the whole-villa rates.'],
            ['Ricardo Mendoza', 'ricardo.mendoza@demo.villacorz.test', 'What time is checkout?'],
        ];

        foreach ($messages as $index => [$name, $email, $message]) {
            $createdAt = now()->subDays(20 - ($index * 3))->setTime(10 + $index, 0);
            $readAt = $index < 4 ? $createdAt->copy()->addHours(2) : null;

            ContactSubmission::create([
                'name' => $name,
                'email' => $email,
                'message' => $message,
                'read_at' => $readAt,
                'mailed_at' => $readAt,
                'created_at' => $createdAt,
                'updated_at' => $readAt ?? $createdAt,
            ]);
        }
    }

    private function seedScheduledReports(User $admin): void
    {
        $schedules = [
            ['revenue', 'weekly', 2],
            ['bookings', 'monthly', 5],
            ['cancellations', 'monthly', 9],
        ];

        foreach ($schedules as [$report, $frequency, $days]) {
            ScheduledReportExport::create([
                'user_id' => $admin->id,
                'email' => $admin->email,
                'report' => $report,
                'frequency' => $frequency,
                'next_run_at' => now()->addDays($days)->setTime(8, 0),
                'active' => true,
            ]);
        }
    }

    protected function stayTotal(Service $service, mixed $checkIn, int $paidDays): float
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
