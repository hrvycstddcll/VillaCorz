<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Service;
use App\Support\StayPolicy;
use App\Support\StayTime;
use Carbon\CarbonImmutable;
use DateTimeInterface;
use Illuminate\Support\Collection;
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

        $query = $this->activityQuery()
            ->where('bookings.check_in', '<', $blockingEnd->toDateTimeString())
            ->where('bookings.check_out', '>', StayPolicy::turnoverCutoffFor($checkInAt)->toDateTimeString());

        if ($ignoreBookingId !== null) {
            $query->where('bookings.id', '!=', $ignoreBookingId);
        }

        $rows = $query->get();

        if ($serviceIds !== null) {
            $serviceIds = array_values(array_unique(array_map('intval', $serviceIds)));

            $rows = $rows->filter(
                fn ($row) => $this->intervalBlocksRequest($row, $serviceIds, $exclusiveServiceId),
            );
        }

        return $rows
            ->map(fn ($row) => $this->mapInterval($row))
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
        $exclusiveServiceId = $this->exclusiveServiceId();
        $intervals = $this->blockingIntervals($checkIn, $paidDays);

        return $services
            ->map(function (Service $service) use ($intervals, $exclusiveServiceId) {
                $blockingIntervals = array_values(array_filter(
                    $intervals,
                    fn (array $interval) => $this->intervalBlocksService($interval, $service, $exclusiveServiceId),
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
        $exclusiveServiceId = $this->exclusiveServiceId();
        $dates = [];

        foreach ($this->blockingIntervalsForWindow($from, $to) as $interval) {
            if (! $this->intervalBlocksService($interval, $service, $exclusiveServiceId)) {
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

        $exclusiveServiceId = $this->exclusiveServiceId();
        $paidDays = (int) ($booking->paid_days ?? $booking->nights ?? 1);

        $this->assertAvailable(
            $serviceIds,
            $booking->check_in,
            $paidDays,
            $exclusiveServiceId,
            $booking->id,
        );
    }

    /**
     * Active room reservations that overlap a whole-villa stay.
     *
     * Used when the villa must win a legacy conflict.
     *
     * @return Collection<int, Booking>
     */
    public function activeConflictingRoomBookings(
        Booking $villa,
        ?DateTimeInterface $from = null,
        bool $lockForUpdate = false,
    ): Collection {
        $villa->loadMissing('rooms');
        $exclusiveServiceId = $this->exclusiveServiceId();

        if ($exclusiveServiceId === null
            || ! $villa->rooms->contains(
                fn ($room) => (int) $room->service_id === $exclusiveServiceId,
            )) {
            return new Collection();
        }

        $paidDays = (int) ($villa->paid_days ?? $villa->nights ?? 1);
        $checkInAt = StayTime::toCarbon($villa->check_in)->utc();
        $blockingEnd = StayPolicy::blockingEndFor($checkInAt, $paidDays);

        $query = Booking::query()
            ->where('id', '!=', $villa->id)
            ->whereIn('status', ['confirmed', 'pending_payment'])
            ->whereHas(
                'rooms',
                fn ($roomQuery) => $roomQuery->where('service_id', '!=', $exclusiveServiceId),
            )
            ->where('check_in', '<', $blockingEnd->toDateTimeString())
            ->where(
                'check_out',
                '>',
                StayPolicy::turnoverCutoffFor($checkInAt)->toDateTimeString(),
            )
            ->where(function ($statusQuery) {
                $statusQuery->where('status', 'confirmed')
                    ->orWhere(function ($pendingQuery) {
                        $pendingQuery->where('status', 'pending_payment')
                            ->whereNotNull('expires_at')
                            ->where('expires_at', '>', now());
                    });
            });

        if ($from !== null) {
            $fromAt = StayTime::toCarbon($from)->utc();

            $query->where(
                'check_out',
                '>',
                StayPolicy::turnoverCutoffFor($fromAt)->toDateTimeString(),
            );
        }

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        return $query->with(['rooms.service', 'payment'])->get();
    }

    private function blockingIntervalsForWindow(
        DateTimeInterface|string $from,
        DateTimeInterface|string $to,
    ): array {
        $fromAt = StayTime::toCarbon($from)->utc()->toDateTimeString();
        $toAt = StayTime::toCarbon($to)->utc()->toDateTimeString();

        return $this->activityQuery()
            ->where('bookings.check_in', '<', $toAt)
            ->where('bookings.check_out', '>', StayPolicy::turnoverCutoffFor($from)->toDateTimeString())
            ->get()
            ->map(fn ($row) => $this->mapInterval($row))
            ->all();
    }

    private function activityQuery()
    {
        return DB::table('booking_rooms')
            ->join('bookings', 'bookings.id', '=', 'booking_rooms.booking_id')
            ->join('services', 'services.id', '=', 'booking_rooms.service_id')
            ->select(
                'booking_rooms.service_id',
                'bookings.id as booking_id',
                'bookings.reference',
                'bookings.status',
                'bookings.check_in',
                'bookings.check_out',
                'services.kind as service_kind',
            )
            ->where(function ($statusQuery) {
                $statusQuery->where('bookings.status', 'confirmed')
                    ->orWhere(function ($pendingQuery) {
                        $pendingQuery->where('bookings.status', 'pending_payment')
                            ->whereNotNull('bookings.expires_at')
                            ->where('bookings.expires_at', '>', now());
                    });
            });
    }

    private function intervalBlocksRequest($row, array $serviceIds, ?int $exclusiveServiceId): bool
    {
        $serviceId = (int) $row->service_id;
        $status = (string) $row->status;
        $serviceKind = (string) $row->service_kind;
        $requestsExclusive = $exclusiveServiceId !== null
            && in_array($exclusiveServiceId, $serviceIds, true);

        if ($status === 'confirmed') {
            if ($requestsExclusive) {
                return true;
            }

            $blockingIds = $serviceIds;

            if ($exclusiveServiceId !== null) {
                $blockingIds[] = $exclusiveServiceId;
            }

            return in_array($serviceId, $blockingIds, true);
        }

        if ($status !== 'pending_payment') {
            return false;
        }

        if ($requestsExclusive) {
            return $serviceKind === 'room';
        }

        return $exclusiveServiceId !== null && $serviceId === $exclusiveServiceId;
    }

    private function intervalBlocksService(array $interval, Service $service, ?int $exclusiveServiceId): bool
    {
        $serviceId = (int) $interval['service_id'];
        $status = (string) $interval['status'];
        $serviceKind = (string) $interval['service_kind'];

        if ($service->kind === 'exclusive') {
            if ($status === 'confirmed') {
                return true;
            }

            return $status === 'pending_payment' && $serviceKind === 'room';
        }

        if ($status === 'confirmed') {
            return $serviceId === (int) $service->id
                || ($exclusiveServiceId !== null && $serviceId === $exclusiveServiceId);
        }

        return $status === 'pending_payment'
            && $exclusiveServiceId !== null
            && $serviceId === $exclusiveServiceId;
    }

    private function mapInterval($row): array
    {
        $turnoverHours = StayPolicy::turnoverHours();

        return [
            'booking_id' => (int) $row->booking_id,
            'reference' => (string) $row->reference,
            'service_id' => (int) $row->service_id,
            'service_kind' => (string) $row->service_kind,
            'status' => (string) $row->status,
            'check_in' => CarbonImmutable::parse($row->check_in)->utc()->toIso8601String(),
            'check_out' => CarbonImmutable::parse($row->check_out)->utc()->toIso8601String(),
            'blocking_end' => CarbonImmutable::parse($row->check_out)
                ->utc()
                ->addHours($turnoverHours)
                ->toIso8601String(),
        ];
    }

    private function exclusiveServiceId(): ?int
    {
        $exclusiveServiceId = Service::query()
            ->where('kind', 'exclusive')
            ->value('id');

        return $exclusiveServiceId !== null ? (int) $exclusiveServiceId : null;
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
