<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Service;
use App\Support\StayPolicy;
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
        int $paidDays,
        ?int $exclusiveServiceId = null,
        ?int $ignoreBookingId = null,
    ): void {
        if ($this->blockingIntervals(
            $checkIn,
            $paidDays,
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
        int $paidDays,
        ?array $serviceIds = null,
        ?int $exclusiveServiceId = null,
        ?int $ignoreBookingId = null,
    ): array {
        $checkInAt = StayTime::toCarbon($checkIn)->utc();
        $blockingEnd = StayPolicy::blockingEndFor($checkInAt, $paidDays);
        $checkInString = $checkInAt->toDateTimeString();
        $blockingEndString = $blockingEnd->toDateTimeString();
        $turnoverHours = StayPolicy::turnoverHours();

        $query = DB::table('booking_rooms')
            ->join('bookings', 'bookings.id', '=', 'booking_rooms.booking_id')
            ->select('booking_rooms.service_id', 'bookings.check_in', 'bookings.check_out')
            ->where('bookings.status', 'confirmed')
            ->where('bookings.check_in', '<', $blockingEndString)
            ->whereRaw('DATE_ADD(bookings.check_out, INTERVAL ? HOUR) > ?', [$turnoverHours, $checkInString]);

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
                'blocking_end' => CarbonImmutable::parse($row->check_out)
                    ->utc()
                    ->addHours($turnoverHours)
                    ->toIso8601String(),
            ])
            ->all();
    }

    public function availabilityForRange(
        DateTimeInterface|string $checkIn,
        int $paidDays,
    ): array {
        $services = Service::query()
            ->where('status', 'active')
            ->orderBy('id')
            ->get(['id', 'name', 'kind']);
        $exclusiveServiceId = Service::query()
            ->where('kind', 'exclusive')
            ->value('id');
        $exclusiveServiceId = $exclusiveServiceId !== null ? (int) $exclusiveServiceId : null;
        $intervals = $this->blockingIntervals($checkIn, $paidDays);

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

        foreach ($this->blockingIntervalsForWindow($from, $to) as $interval) {
            if ($service->kind !== 'exclusive'
                && $interval['service_id'] !== (int) $service->id
                && $interval['service_id'] !== $exclusiveServiceId) {
                continue;
            }

            foreach ($this->datesForInterval($interval) as $date) {
                $dates[$date] = true;
            }
        }

        $result = array_keys($dates);
        sort($result);

        return $result;
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
        $paidDays = (int) ($booking->paid_days ?? $booking->nights ?? 1);

        $this->assertAvailable(
            $serviceIds,
            $booking->check_in,
            $paidDays,
            $exclusiveServiceId !== null ? (int) $exclusiveServiceId : null,
            $booking->id,
        );
    }

    private function blockingIntervalsForWindow(
        DateTimeInterface|string $from,
        DateTimeInterface|string $to,
    ): array {
        $fromAt = StayTime::toCarbon($from)->utc()->toDateTimeString();
        $toAt = StayTime::toCarbon($to)->utc()->toDateTimeString();
        $turnoverHours = StayPolicy::turnoverHours();

        return DB::table('booking_rooms')
            ->join('bookings', 'bookings.id', '=', 'booking_rooms.booking_id')
            ->select('booking_rooms.service_id', 'bookings.check_in', 'bookings.check_out')
            ->where('bookings.status', 'confirmed')
            ->where('bookings.check_in', '<', $toAt)
            ->whereRaw('DATE_ADD(bookings.check_out, INTERVAL ? HOUR) > ?', [$turnoverHours, $fromAt])
            ->get()
            ->map(fn ($row) => [
                'service_id' => (int) $row->service_id,
                'check_in' => CarbonImmutable::parse($row->check_in)->utc()->toIso8601String(),
                'check_out' => CarbonImmutable::parse($row->check_out)->utc()->toIso8601String(),
                'blocking_end' => CarbonImmutable::parse($row->check_out)
                    ->utc()
                    ->addHours($turnoverHours)
                    ->toIso8601String(),
            ])
            ->all();
    }

    private function datesForInterval(array $interval): array
    {
        $start = CarbonImmutable::parse($interval['check_in'])
            ->setTimezone(StayTime::TIMEZONE)
            ->startOfDay();
        $blockingEnd = CarbonImmutable::parse($interval['blocking_end'] ?? $interval['check_out'])
            ->setTimezone(StayTime::TIMEZONE);

        // Block only arrival dates while the occupancy/turnover window is active.
        $lastStart = $blockingEnd->subSecond()->startOfDay();

        if ($lastStart->lt($start)) {
            return [];
        }

        $dates = [];
        $cursor = $start;

        while ($cursor->lessThanOrEqualTo($lastStart)) {
            $dates[] = $cursor->toDateString();
            $cursor = $cursor->addDay();
        }

        return $dates;
    }
}
