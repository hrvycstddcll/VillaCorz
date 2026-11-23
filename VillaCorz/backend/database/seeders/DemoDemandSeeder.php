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

class DemoDemandSeeder extends Seeder
{
    /**
     * Seed historical booking demand with a smooth weekday/weekend/holiday
     * curve and roughly Php 100k paid revenue per rolling 30 days.
     * Safe to run more than once.
     */
    public function run(): void
    {
        $this->backdateExistingDemoBookings();
        $this->resetDemandBookings();

        $customers = User::where('email', 'like', '%@demo.villacorz.test')
            ->orderBy('id')
            ->get();

        $services = Service::where('status', 'active')->orderBy('id')->get();
        if ($customers->isEmpty() || $services->isEmpty()) {
            return;
        }

        $rooms = $services->where('kind', 'room')->values();
        $pool = $rooms->isNotEmpty() ? $rooms : $services->values();
        $holidays = $this->philippineHolidays();

        for ($offset = 365; $offset >= 1; $offset--) {
            $date = now()->startOfDay()->subDays($offset);
            $dateKey = $date->toDateString();
            $weekday = (int) $date->dayOfWeek;
            $isPeakMonth = in_array((int) $date->month, [4, 5, 11, 12], true);
            $isLowMonth = in_array((int) $date->month, [1, 2, 6, 9], true);

            $weekdayBase = [0 => 0, 1 => 0, 2 => 0, 3 => 0, 4 => 1, 5 => 1, 6 => 1];
            $count = $weekdayBase[$weekday] ?? 0;
            if (isset($holidays[$dateKey])) {
                $count += 1;
            }
            if ($isPeakMonth) {
                $count += 1;
            }
            if ($isLowMonth) {
                $count = 0;
            }
            if (crc32('spike-'.$dateKey) % 12 === 0) {
                $count += 1;
            }
            if (crc32('dip-'.$dateKey) % 5 === 0) {
                $count = 0;
            }
            $count = max(0, $count);

            $candidates = [];
            for ($index = 0; $index < $count; $index++) {
                $reference = 'VC-DEMAND-'.$dateKey.'-'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);

                if (Booking::where('reference', $reference)->exists()) {
                    continue;
                }

                $service = $pool[crc32($reference) % $pool->count()];
                $paidDays = 1 + (crc32('paid-days-'.$reference) % 3);
                $leadDays = 3 + (crc32('lead-'.$reference) % 46);
                $checkIn = StayTime::parseLocal(
                    $date->copy()->addDays($leadDays)->toDateString(),
                    StayPolicy::defaultCheckInTime(),
                );
                $checkOut = StayPolicy::checkOutFor($checkIn, $paidDays);
                $createdAt = $date->copy()
                    ->setTime(8 + (crc32('hour-'.$reference) % 13), crc32('minute-'.$reference) % 60);
                $customer = $customers[crc32('customer-'.$reference) % $customers->count()];
                $total = $this->bookingTotal($service, $checkIn, $paidDays);

                $candidates[] = [
                    'index' => $index,
                    'reference' => $reference,
                    'service' => $service,
                    'customer' => $customer,
                    'paid_days' => $paidDays,
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'created_at' => $createdAt,
                    'paid_at' => $createdAt->copy()->addMinutes(10),
                    'total' => $total,
                ];
            }

            $dailyTarget = 3333;
            $bestMask = 0;
            $bestTotal = -1.0;

            foreach ($candidates as $candidateIndex => $candidate) {
                if ($candidate['total'] <= $dailyTarget && $candidate['total'] > $bestTotal) {
                    $bestTotal = $candidate['total'];
                    $bestMask = 1 << $candidateIndex;
                }
            }

            foreach ($candidates as $candidateIndex => $candidate) {
                if (($bestMask & (1 << $candidateIndex)) === 0) {
                    continue;
                }

                $reference = $candidate['reference'];
                $service = $candidate['service'];
                $customer = $candidate['customer'];
                $paidDays = $candidate['paid_days'];
                $checkIn = $candidate['check_in'];
                $checkOut = $candidate['check_out'];
                $createdAt = $candidate['created_at'];
                $paidAt = $candidate['paid_at'];
                $total = $candidate['total'];
                $index = $candidate['index'];

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
                    'status' => 'confirmed',
                    'payment_method' => 'GCash',
                    'confirmed_at' => $createdAt->copy()->addMinutes(5),
                    'completed_at' => $checkOut->isPast() ? $checkOut : null,
                    'confirmation_email_sent_at' => $createdAt->copy()->addMinutes(15),
                    'idempotency_key' => 'seed-demand-booking-'.$dateKey.'-'.$index,
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

                $payment = Payment::create([
                    'booking_id' => $booking->id,
                    'reference' => 'PAY-DEMAND-'.$dateKey.'-'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT),
                    'provider' => 'demo',
                    'method' => 'GCash',
                    'amount' => $total,
                    'currency' => 'PHP',
                    'status' => 'paid',
                    'idempotency_key' => 'seed-demand-payment-'.$dateKey.'-'.$index,
                    'qr_token_hash' => hash('sha256', 'seed-demand-token-'.$dateKey.'-'.$index),
                    'qr_url' => rtrim((string) config('payments.public_url'), '/').'/pay/seed-'.$dateKey.'-'.$index,
                    'qr_expires_at' => $createdAt->copy()->addHour(),
                    'paid_at' => $paidAt,
                ]);
                $payment->forceFill([
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ])->saveQuietly();
            }
        }
    }

    /**
     * The original demo seeder created its bookings "now", which made all demo
     * demand look like a two-day spike. Move those rows behind their check-in.
     */
    private function backdateExistingDemoBookings(): void
    {
        $bookings = Booking::query()
            ->where('reference', 'like', 'VC-DEMO-%')
            ->with('payments')
            ->get();

        foreach ($bookings as $booking) {
            if ($booking->check_in === null) {
                continue;
            }

            $checkIn = Carbon::parse($booking->check_in);
            $leadDays = 7 + (crc32($booking->reference) % 15);
            $createdAt = $checkIn->copy()->subDays($leadDays)->setTime(10, 0);

            if ($createdAt->isFuture()) {
                continue;
            }

            $paidAt = $createdAt->copy()->addMinutes(10);
            $booking->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ])->saveQuietly();

            foreach ($booking->payments as $payment) {
                $payment->forceFill([
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                    'paid_at' => $paidAt,
                ])->saveQuietly();
            }
        }
    }

    private function resetDemandBookings(): void
    {
        $bookingIds = Booking::query()
            ->where('reference', 'like', 'VC-DEMAND-%')
            ->pluck('id');

        if ($bookingIds->isEmpty()) {
            return;
        }

        Payment::query()->whereIn('booking_id', $bookingIds)->delete();
        BookingRoom::query()->whereIn('booking_id', $bookingIds)->delete();
        Booking::query()->whereIn('id', $bookingIds)->delete();
    }

    private function bookingTotal(Service $service, mixed $checkIn, int $paidDays): float
    {
        $weekdayPrice = (float) $service->price;
        $weekendPrice = (float) ($service->weekend_price ?? $service->price);
        $total = 0.0;

        foreach (StayPolicy::windows($checkIn, $paidDays) as $window) {
            $total += $window['is_weekend'] ? $weekendPrice : $weekdayPrice;
        }

        return round($total, 2);
    }

    /**
     * @return array<string, string>
     */
    private function philippineHolidays(): array
    {
        $holidays = [];

        foreach ([2025, 2026, 2027] as $year) {
            $holidays["{$year}-01-01"] = "New Year's Day";
            $holidays["{$year}-04-09"] = 'Araw ng Kagitingan';
            $holidays["{$year}-05-01"] = 'Labor Day';
            $holidays["{$year}-06-12"] = 'Independence Day';
            $holidays["{$year}-08-21"] = 'Ninoy Aquino Day';
            $holidays["{$year}-08-31"] = 'National Heroes Day';
            $holidays["{$year}-11-30"] = 'Bonifacio Day';
            $holidays["{$year}-12-25"] = 'Christmas Day';
            $holidays["{$year}-12-30"] = 'Rizal Day';
            $holidays["{$year}-12-31"] = "New Year's Eve";
        }

        return $holidays;
    }
}
