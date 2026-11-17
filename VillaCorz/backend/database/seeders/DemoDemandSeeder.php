<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\Payment;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DemoDemandSeeder extends Seeder
{
    /**
     * Seed enough historical booking demand for the forecast model to learn
     * a smooth weekday/weekend/holiday curve. Safe to run more than once.
     */
    public function run(): void
    {
        $this->backdateExistingDemoBookings();
        $this->resetDemandBookings();
        $this->normalizeRoomPrices();

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

        for ($offset = 270; $offset >= 1; $offset--) {
            $date = now()->startOfDay()->subDays($offset);
            $dateKey = $date->toDateString();
            $weekday = (int) $date->dayOfWeek;
            $isPeakMonth = in_array((int) $date->month, [4, 5, 11, 12], true);

            $weekdayBase = [0 => 2, 1 => 1, 2 => 1, 3 => 1, 4 => 1, 5 => 2, 6 => 3];
            $count = $weekdayBase[$weekday] ?? 1;
            if (isset($holidays[$dateKey])) {
                $count += 1;
            }
            if ($isPeakMonth) {
                $count += 1;
            }
            if (crc32('jitter-'.$dateKey) % 5 === 0) {
                $count += 1;
            }

            for ($index = 0; $index < $count; $index++) {
                $reference = 'VC-DEMAND-'.$dateKey.'-'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);

                if (Booking::where('reference', $reference)->exists()) {
                    continue;
                }

                $service = $pool[crc32($reference) % $pool->count()];
                $nights = 1 + (crc32('nights-'.$reference) % 3);
                $leadDays = 3 + (crc32('lead-'.$reference) % 19);
                $checkIn = $date->copy()->addDays($leadDays);
                $checkOut = $checkIn->copy()->addDays($nights);
                $createdAt = $date->copy()
                    ->setTime(8 + (crc32('hour-'.$reference) % 13), crc32('minute-'.$reference) % 60);
                $paidAt = $createdAt->copy()->addMinutes(10);
                $customer = $customers[crc32('customer-'.$reference) % $customers->count()];
                $total = $this->bookingTotal($service, $checkIn, $nights);

                $booking = Booking::create([
                    'user_id' => $customer->id,
                    'reference' => $reference,
                    'contact_name' => trim($customer->firstname.' '.$customer->lastname),
                    'contact_email' => $customer->email,
                    'contact_phone' => null,
                    'check_in' => $checkIn,
                    'check_out' => $checkOut,
                    'nights' => $nights,
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

    private function normalizeRoomPrices(): void
    {
        $prices = [
            'Room 1' => [3000, 3000],
            'Room 2' => [3000, 3000],
            'Room 3' => [3000, 3000],
            'Room 4' => [4000, 4000],
            'Room 5' => [4000, 4000],
            'The Whole Villa' => [15500, 17000],
        ];

        foreach ($prices as $name => [$weekday, $weekend]) {
            Service::query()
                ->where('name', $name)
                ->update([
                    'price' => $weekday,
                    'weekend_price' => $weekend,
                ]);
        }
    }

    private function bookingTotal(Service $service, Carbon $checkIn, int $nights): float
    {
        $weekdayPrice = (float) $service->price;
        $weekendPrice = (float) ($service->weekend_price ?? $service->price);
        $total = 0.0;

        for ($night = 0; $night < $nights; $night++) {
            $nightDate = $checkIn->copy()->addDays($night);
            $total += in_array((int) $nightDate->dayOfWeek, [0, 5, 6], true)
                ? $weekendPrice
                : $weekdayPrice;
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
