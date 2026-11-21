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
use App\Models\User;
use App\Models\UserPhoneNumber;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DemoCleanReseedSeeder extends DemoReseedSeeder
{
    public function run(): void
    {
        $this->assertBaseline();

        $reviews = ServiceReview::with('booking')->orderBy('id')->get();
        $proofReferences = $reviews->mapWithKeys(function (ServiceReview $review) {
            return [
                $review->id => $review->booking?->reference
                    ?? 'VC-REVIEW-R'.$review->service_id.'-U'.$review->user_id,
            ];
        });

        DB::transaction(function () use ($reviews, $proofReferences) {
            $this->resetTransactionalData();

            if ($reviews->isEmpty()) {
                $this->call(DemoReviewSeeder::class);
            } else {
                $this->restoreReviewProofBookings($reviews->values(), $proofReferences);
            }

            $this->call(DemoCustomerSeeder::class);
            $this->call(DemoDemandSeeder::class);
            $this->normalizeRevenue();
            $this->call(DemoAnalyticsSeeder::class);
            $this->seedOperationalData();
        });
    }

    private function assertBaseline(): void
    {
        if (! User::where('email', 'dlord0260@gmail.com')->exists()) {
            throw new \RuntimeException('Clean reseed requires the existing admin account.');
        }

        if (! User::where('email', 'dacillohaydee@gmail.com')->exists()) {
            throw new \RuntimeException('Clean reseed requires the existing Haydee customer account.');
        }

        if (User::where('email', 'like', '%@demo.villacorz.test')->count() < 12) {
            throw new \RuntimeException('Clean reseed requires all 12 demo customer accounts.');
        }

        if (! Service::where('kind', 'room')->where('status', 'active')->exists()) {
            throw new \RuntimeException('Clean reseed requires at least one active room service.');
        }

        if (! Service::where('kind', 'exclusive')->where('status', 'active')->exists()) {
            throw new \RuntimeException('Clean reseed requires the active whole-villa service.');
        }
    }

    private function resetTransactionalData(): void
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
    }

    private function normalizeRevenue(): void
    {
        $windowStart = now()->startOfDay()->subDays(29);
        $windowEnd = now()->endOfDay();
        $target = 143000.0;

        $revenue = (float) Payment::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$windowStart, $windowEnd])
            ->sum('amount');

        if ($revenue <= $target + 5000) {
            return;
        }

        $payments = Payment::query()
            ->where('status', 'paid')
            ->where('reference', 'like', 'PAY-VC-DEMO-%')
            ->whereBetween('paid_at', [$windowStart, $windowEnd])
            ->orderByDesc('amount')
            ->get()
            ->values()
            ->all();

        if ($payments === []) {
            return;
        }

        $excess = $revenue - $target;
        $bestMask = 0;
        $bestSum = 0.0;
        $limit = 1 << count($payments);

        for ($mask = 1; $mask < $limit; $mask++) {
            $sum = 0.0;

            foreach ($payments as $index => $payment) {
                if (($mask & (1 << $index)) !== 0) {
                    $sum += (float) $payment->amount;
                }
            }

            if ($sum >= $excess && ($bestSum < $excess || $sum - $excess < $bestSum - $excess)) {
                $bestMask = $mask;
                $bestSum = $sum;
            }
        }

        foreach ($payments as $index => $payment) {
            if (($bestMask & (1 << $index)) === 0) {
                continue;
            }

            $paidAt = $windowStart->copy()->subDays(35)->setTime(10, 0);
            $createdAt = $paidAt->copy()->subMinutes(10);

            $payment->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $paidAt,
                'paid_at' => $paidAt,
            ])->saveQuietly();

            $booking = $payment->booking;
            if ($booking) {
                $booking->forceFill([
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                    'confirmed_at' => $paidAt->copy()->addMinutes(5),
                ])->saveQuietly();
            }
        }
    }

    private function restoreReviewProofBookings(Collection $reviews, Collection $proofReferences): void
    {
        $services = Service::whereIn('id', $reviews->pluck('service_id')->unique())
            ->get()
            ->keyBy('id');
        $customers = User::whereIn('id', $reviews->pluck('user_id')->unique())
            ->get()
            ->keyBy('id');

        foreach ($reviews as $slot => $review) {
            $service = $services->get($review->service_id);
            $customer = $customers->get($review->user_id);

            if (! $service || ! $customer) {
                continue;
            }

            $reference = (string) $proofReferences->get($review->id);
            $checkOut = now()->subDays(6 + (($slot % 10) * 3))->startOfDay();
            $checkIn = $checkOut->copy()->subDays(2);
            $createdAt = $checkIn->copy()->subDays(4);
            $total = (float) $service->price * 2;

            $booking = Booking::create([
                'user_id' => $customer->id,
                'reference' => $reference,
                'contact_name' => trim($customer->firstname.' '.$customer->lastname),
                'contact_email' => $customer->email,
                'contact_phone' => null,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'nights' => 2,
                'adults' => 2,
                'kids' => 0,
                'subtotal' => $total,
                'total' => $total,
                'currency' => 'PHP',
                'status' => 'confirmed',
                'payment_method' => 'GCash',
                'confirmed_at' => $createdAt,
                'completed_at' => $checkOut,
                'idempotency_key' => 'seed-review-proof-'.$review->id,
                'request_hash' => hash('sha256', $reference),
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

            DB::table('service_reviews')
                ->where('id', $review->id)
                ->update(['booking_id' => $booking->id]);
        }
    }
}
