<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Service;
use App\Support\StayTime;
use Carbon\CarbonImmutable;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingAvailability
{
    public function assertAvailable(
        array $serviceIds,
        DateTimeInterface|string $checkIn,
        DateTimeInterface|string $checkOut,
        ?int $exclusiveServiceId = null,
        ?int $ignoreBookingId = null,
    ): void {
        if ($this->blockingIntervals(
            $checkIn,
            $checkOut,
            $serviceIds,
            $exclusiveServiceId,
            $ignoreBookingId,
        ) !== []) {
            throw ValidationException::withMessages([
                'rooms' => 'One or more selected rooms are no longer available for those dates and times.',
            ]);
        }
    }

    public function blockingIntervals(
        DateTimeInterface|string $checkIn,
        DateTimeInterface|string $checkOut,
        ?array $serviceIds = null,
        ?int $exclusiveServiceId = null,
        ?int $ignoreBookingId = null,
    ): array {
        $checkIn = StayTime::toCarbon($checkIn)->toDateTimeString();
        $checkOut = StayTime::toCarbon($checkOut)->toDateTimeString();

        $query = DB::table('booking_rooms')
            ->join('bookings', 'bookings.id', '=', 'booking_rooms.booking_id')
            ->select('booking_rooms.service_id', 'bookings.check_in', 'bookings.check_out')
            ->where('bookings.status', 'confirmed')
            ->where('bookings.check_in', '<', $checkOut)
            ->where('bookings.check_out', '>', $checkIn);

        if ($ignoreBookingId !== null) {
            $query->where('bookings.id', '!=', $ignoreBookingId);
        }

        if ($serviceIds !== null) {
            $serviceIds = array_values(array_unique(array_map('intval', $serviceIds)));
            $requestsExclusive = $exclusiveServiceId !== null
                && in_array($exclusiveServiceId, $serviceIds, true);

            if ($requestsExclusive) {
                $query->whereNotNull('booking_rooms.service_id');
            } else {
                $blockingIds = $serviceIds;

                if ($exclusiveServiceId !== null) {
                    $blockingIds[] = $exclusiveServiceId;
                }

                $query->whereIn('booking_rooms.service_id', array_values(array_unique($blockingIds)));
            }
        }

        return $query->get()
            ->map(fn ($row) => [
                'service_id' => (int) $row->service_id,
                'check_in' => CarbonImmutable::parse($row->check_in)->utc()->toIso8601String(),
                'check_out' => CarbonImmutable::parse($row->check_out)->utc()->toIso8601String(),
            ])
            ->all();
    }

    public function availabilityForRange(
        DateTimeInterface|string $checkIn,
        DateTimeInterface|string $checkOut,
    ): array {
        $services = Service::query()
            ->where('status', 'active')
            ->orderBy('id')
            ->get(['id', 'name', 'kind']);
        $exclusiveServiceId = Service::query()
            ->where('kind', 'exclusive')
            ->value('id');
        $exclusiveServiceId = $exclusiveServiceId !== null ? (int) $exclusiveServiceId : null;
        $intervals = $this->blockingIntervals($checkIn, $checkOut);

        return $services
            ->map(function (Service $service) use ($intervals, $exclusiveServiceId) {
                $blockingIntervals = array_values(array_filter(
                    $intervals,
                    function (array $interval) use ($service, $exclusiveServiceId) {
                        if ($service->kind === 'exclusive') {
                            return true;
                        }

                        return $interval['service_id'] === (int) $service->id
                            || $interval['service_id'] === $exclusiveServiceId;
                    },
                ));

                return [
                    'id' => (int) $service->id,
                    'available' => $blockingIntervals === [],
                    'blocked_intervals' => $blockingIntervals,
                ];
            })
            ->all();
    }

    public function unavailableDates(
        Service $service,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): array {
        $exclusiveServiceId = Service::query()
            ->where('kind', 'exclusive')
            ->value('id');
        $exclusiveServiceId = $exclusiveServiceId !== null ? (int) $exclusiveServiceId : null;
        $dates = [];

        foreach ($this->blockingIntervals($from, $to) as $interval) {
            if ($service->kind !== 'exclusive'
                && $interval['service_id'] !== (int) $service->id
                && $interval['service_id'] !== $exclusiveServiceId) {
                continue;
            }

            foreach ($this->datesForInterval($interval) as $date) {
                $dates[$date] = true;
            }
        }

        return array_keys($dates);
    }

    public function assertBookingAvailable(Booking $booking): void
    {
        $booking->loadMissing('rooms');

        $serviceIds = $booking->rooms
            ->pluck('service_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $exclusiveServiceId = Service::query()
            ->where('kind', 'exclusive')
            ->value('id');

        $this->assertAvailable(
            $serviceIds,
            $booking->check_in,
            $booking->check_out,
            $exclusiveServiceId !== null ? (int) $exclusiveServiceId : null,
            $booking->id,
        );
    }

    private function datesForInterval(array $interval): array
    {
        $start = StayTime::localDate($interval['check_in']);
        $end = StayTime::localDate($interval['check_out']);
        $checkoutTime = StayTime::toCarbon($interval['check_out'])
            ->setTimezone(StayTime::TIMEZONE)
            ->format('H:i');

        if ($checkoutTime <= '08:00') {
            $end = CarbonImmutable::parse($end, StayTime::TIMEZONE)
                ->subDay()
                ->toDateString();
        }

        if ($end < $start) {
            return [];
        }

        $dates = [];
        $cursor = CarbonImmutable::parse($start, StayTime::TIMEZONE);
        $lastDate = CarbonImmutable::parse($end, StayTime::TIMEZONE);

        while ($cursor->lessThanOrEqualTo($lastDate)) {
            $dates[] = $cursor->toDateString();
            $cursor = $cursor->addDay();
        }

        return $dates;
    }
}
