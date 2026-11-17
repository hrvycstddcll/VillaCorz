<?php

namespace App\Queries\Offers;

use App\Models\BookingRoom;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class OfferMetricsQuery
{
    public function services(): Collection
    {
        return Service::query()
            ->withAvg('reviews as rating_average', 'rating')
            ->withCount(['reviews as reviews_count'])
            ->get(['id', 'name', 'kind', 'status', 'price', 'weekend_price']);
    }

    public function metricsFor(
        Collection $services,
        int $range,
        Carbon $start,
        Carbon $end,
    ): Collection {
        return $services->map(function (Service $service) use ($range, $start, $end) {
            $roomBookings = BookingRoom::query()
                ->where('service_id', $service->id)
                ->whereHas('booking', function ($query) use ($start, $end) {
                    $query->whereBetween('created_at', [$start, $end])
                        ->where('status', 'confirmed');
                })
                ->with('booking:id,status,check_in,check_out')
                ->get();

            $paidRooms = BookingRoom::query()
                ->where('service_id', $service->id)
                ->whereHas('booking.payments', function ($query) use ($start, $end) {
                    $query->where('status', 'paid')
                        ->whereBetween('paid_at', [$start, $end]);
                })
                ->get(['booking_id', 'line_total']);

            $occupiedNights = BookingRoom::query()
                ->where('service_id', $service->id)
                ->whereHas('booking', function ($query) use ($start, $end) {
                    $query->where('status', 'confirmed')
                        ->whereDate('check_in', '<', $end->toDateString())
                        ->whereDate('check_out', '>', $start->toDateString())
                        ->whereHas('payments', fn ($paymentQuery) => $paymentQuery->where('status', 'paid'));
                })
                ->with('booking:id,nights,check_in,check_out')
                ->get()
                ->sum(function (BookingRoom $room) use ($start, $end) {
                    $booking = $room->booking;
                    if ($booking === null) {
                        return 0;
                    }

                    $occupiedFrom = max($start->toDateString(), $booking->check_in->toDateString());
                    $occupiedUntil = min($end->toDateString(), $booking->check_out->toDateString());

                    return max(0, Carbon::parse($occupiedFrom)->diffInDays(Carbon::parse($occupiedUntil)));
                });

            $availabilityDays = $service->status === 'active' ? $range : 0;

            return [
                'service_id' => $service->id,
                'name' => $service->name,
                'bookings' => $roomBookings->pluck('booking_id')->unique()->count(),
                'revenue' => (float) $paidRooms->sum('line_total'),
                'occupancy' => $availabilityDays > 0
                    ? round(($occupiedNights / $availabilityDays) * 100, 1)
                    : 0,
                'rating' => $service->rating_average !== null
                    ? (float) $service->rating_average
                    : 0,
            ];
        })->values();
    }

    public function availability(): array
    {
        $availabilityBookings = BookingRoom::query()
            ->whereHas('booking', function ($query) {
                $query->where('status', 'confirmed')
                    ->whereDate('check_in', '<', now()->addDays(30)->toDateString())
                    ->whereDate('check_out', '>', now()->toDateString());
            })
            ->with('booking:id,check_in,check_out')
            ->get(['service_id', 'booking_id']);

        return $availabilityBookings
            ->filter(fn (BookingRoom $room) => $room->service_id !== null && $room->booking !== null)
            ->groupBy('service_id')
            ->map(fn ($rooms) => $rooms->map(fn (BookingRoom $room) => [
                'check_in' => $room->booking->check_in->toDateString(),
                'check_out' => $room->booking->check_out->toDateString(),
            ])->values())
            ->all();
    }
}
