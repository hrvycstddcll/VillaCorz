<?php

namespace App\Services\Assistant;

use App\Models\Booking;
use App\Models\Service;
use App\Models\User;
use App\Support\StayTime;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CustomerAssistantContextBuilder
{
    private const MAX_UPCOMING_BOOKINGS = 5;

    private const MAX_RECENT_BOOKINGS = 5;

    private const MAX_SERVICES = 20;

    private const DESCRIPTION_LIMIT = 240;

    private const VILLA = [
        'name' => 'VillaCorz',
        'area' => 'Matabungkay, Lian, Batangas',
        'coordinates' => [
            'lat' => 13.95007,
            'lng' => 120.618683,
        ],
        'map_note' => 'See the Contact page for the map and directions.',
    ];

    /**
     * @param  array{lat?: mixed, lng?: mixed}|null  $userLocation
     * @return array<string, mixed>
     */
    public function build(
        User $user,
        string $page,
        string $message = '',
        ?array $userLocation = null,
    ): array {
        $today = now()->setTimezone(StayTime::TIMEZONE);

        $upcoming = Booking::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['pending_payment', 'confirmed'])
            ->where('check_out', '>=', $today)
            ->with(['rooms', 'payment', 'latestCancellationRequest'])
            ->orderBy('check_in')
            ->orderBy('id')
            ->limit(self::MAX_UPCOMING_BOOKINGS)
            ->get();

        $recent = Booking::query()
            ->where('user_id', $user->id)
            ->with(['rooms', 'payment', 'latestCancellationRequest'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(self::MAX_RECENT_BOOKINGS)
            ->get();

        $services = Service::query()
            ->where('status', 'active')
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->orderBy('kind')
            ->orderBy('name')
            ->limit(self::MAX_SERVICES)
            ->get();

        $snapshot = [
            'today' => $today->toDateString(),
            'page' => $page,
            'villa' => self::VILLA,
            'customer' => [
                'first_name' => $user->firstname,
            ],
            'bookings' => [
                'upcoming' => $upcoming
                    ->map(fn (Booking $booking) => $this->bookingSummary($booking, $today))
                    ->values()
                    ->all(),
                'recent' => $recent
                    ->map(fn (Booking $booking) => $this->bookingSummary($booking, $today))
                    ->values()
                    ->all(),
            ],
            'services' => $services
                ->map(fn (Service $service) => $this->serviceSummary($service))
                ->values()
                ->all(),
            'policies' => [
                'cancellation' => 'Direct cancellation is available only for pending-payment or confirmed bookings with at least 7 days before check-in. Within 7 days, confirmed bookings may submit an emergency cancellation request for review. Completed, cancelled, and expired stays cannot be cancelled.',
                'payments' => 'Payment options shown in the booking flow are GCash, Maya, PayPal, BDO, Unionbank Internet Banking, and BPI.',
                'support' => 'Customers can contact the VillaCorz team through the Contact page for human assistance.',
            ],
        ];

        $distance = $this->distanceFromUser($userLocation);
        if ($distance !== null) {
            $snapshot['user_location'] = [
                'shared' => true,
                'straight_line_distance_km_to_villa' => $distance,
                'distance_type' => 'straight-line (approximate)',
            ];
        }

        $availability = $this->availabilityCheck($message, $today, $services);
        if ($availability !== null) {
            $snapshot['availability_check'] = $availability;
        }

        return $snapshot;
    }

    /**
     * @return array<string, mixed>
     */
    private function bookingSummary(Booking $booking, Carbon $today): array
    {
        $checkIn = $booking->check_in;
        $daysUntilCheckIn = $checkIn
            ? (int) floor(($checkIn->getTimestamp() - $today->getTimestamp()) / 86400)
            : null;
        $completed = $booking->isCompleted();
        $activeStatus = in_array($booking->status, ['pending_payment', 'confirmed'], true);
        $cancellationRequest = $booking->latestCancellationRequest;
        $requestPending = $cancellationRequest?->status === 'pending';

        return [
            'reference' => $booking->reference,
            'status' => $booking->status,
            'lifecycle' => $booking->lifecycle,
            'check_in' => $booking->check_in ? StayTime::formatPht($booking->check_in, 'Y-m-d H:i P') : null,
            'check_out' => $booking->check_out ? StayTime::formatPht($booking->check_out, 'Y-m-d H:i P') : null,
            'nights' => $booking->nights,
            'adults' => $booking->adults,
            'kids' => $booking->kids,
            'total' => (float) $booking->total,
            'currency' => $booking->currency ?: 'PHP',
            'payment' => $booking->payment ? [
                'status' => $booking->payment->status,
                'method' => $booking->payment->method,
                'amount' => (float) $booking->payment->amount,
                'paid_at' => $booking->payment->paid_at?->toIso8601String(),
            ] : null,
            'rooms' => $booking->rooms
                ->map(fn ($room) => [
                    'name' => $room->service_name,
                    'kind' => $room->kind,
                    'adults' => $room->adults,
                    'kids' => $room->kids,
                    'line_total' => (float) $room->line_total,
                ])
                ->values()
                ->all(),
            'cancellation' => [
                'days_until_check_in' => $daysUntilCheckIn,
                'direct_cancellation_available' => $activeStatus
                    && ! $completed
                    && $daysUntilCheckIn !== null
                    && $daysUntilCheckIn >= 7,
                'emergency_request_available' => $booking->status === 'confirmed'
                    && ! $completed
                    && $daysUntilCheckIn !== null
                    && $daysUntilCheckIn < 7
                    && ! $requestPending,
                'latest_request_status' => $cancellationRequest?->status,
                'latest_requested_at' => $cancellationRequest?->created_at?->toIso8601String(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serviceSummary(Service $service): array
    {
        $rating = $service->getAttribute('reviews_avg_rating');

        return [
            'name' => $service->name,
            'kind' => $service->kind,
            'description' => Str::limit((string) $service->description, self::DESCRIPTION_LIMIT),
            'weekday_price' => (float) $service->price,
            'weekend_price' => $service->weekend_price !== null
                ? (float) $service->weekend_price
                : null,
            'pax' => $service->pax,
            'additional_head_weekday_price' => (float) $service->additional_head_weekday_price,
            'additional_head_weekend_price' => (float) $service->additional_head_weekend_price,
            'weekday_discount' => $this->discount(
                $service->weekday_discount_type,
                $service->weekday_discount_value,
            ),
            'weekend_discount' => $this->discount(
                $service->weekend_discount_type,
                $service->weekend_discount_value,
            ),
            'features' => $service->features ?? [],
            'amenities' => $service->amenities ?? [],
            'rating' => $rating !== null ? round((float) $rating, 1) : null,
            'review_count' => (int) $service->getAttribute('reviews_count'),
        ];
    }

    /**
     * @param  array{lat?: mixed, lng?: mixed}|null  $userLocation
     */
    private function distanceFromUser(?array $userLocation): ?float
    {
        if (! is_array($userLocation)) {
            return null;
        }

        $lat = $userLocation['lat'] ?? null;
        $lng = $userLocation['lng'] ?? null;

        if (! is_numeric($lat) || ! is_numeric($lng)) {
            return null;
        }

        $lat = (float) $lat;
        $lng = (float) $lng;

        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            return null;
        }

        $villaLat = self::VILLA['coordinates']['lat'];
        $villaLng = self::VILLA['coordinates']['lng'];
        $earthRadiusKm = 6371.0;

        $dLat = deg2rad($villaLat - $lat);
        $dLng = deg2rad($villaLng - $lng);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat)) * cos(deg2rad($villaLat)) * sin($dLng / 2) ** 2;

        $km = $earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($km, 1);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Service>  $services
     * @return array<string, mixed>|null
     */
    private function availabilityCheck(
        string $message,
        Carbon $today,
        $services,
    ): ?array {
        $range = $this->requestedRange($message, $today);

        if ($range === null) {
            return null;
        }

        [$checkIn, $checkOut, $label] = $range;
        $checkInAt = StayTime::toCarbon($checkIn)->toDateTimeString();
        $checkOutAt = StayTime::toCarbon($checkOut)->toDateTimeString();
        $checkInDate = StayTime::formatPht($checkIn, 'Y-m-d H:i P');
        $checkOutDate = StayTime::formatPht($checkOut, 'Y-m-d H:i P');

        $exclusiveServiceId = $services->firstWhere('kind', 'exclusive')?->id;
        $exclusiveServiceId = $exclusiveServiceId !== null ? (int) $exclusiveServiceId : null;

        $overlaps = DB::table('booking_rooms')
            ->join('bookings', 'bookings.id', '=', 'booking_rooms.booking_id')
            ->where('bookings.status', 'confirmed')
            ->where('bookings.check_in', '<', $checkOutAt)
            ->where('bookings.check_out', '>', $checkInAt)
            ->whereNotNull('booking_rooms.service_id')
            ->pluck('booking_rooms.service_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $hasAnyOverlap = $overlaps !== [];
        $blockedExclusive = $exclusiveServiceId !== null && in_array($exclusiveServiceId, $overlaps, true);

        $results = $services->map(function (Service $service) use (
            $overlaps,
            $hasAnyOverlap,
            $blockedExclusive,
            $exclusiveServiceId,
        ): array {
            $id = (int) $service->id;
            $available = $service->kind === 'exclusive'
                ? ! $hasAnyOverlap
                : (! in_array($id, $overlaps, true) && ! $blockedExclusive);

            return [
                'name' => $service->name,
                'kind' => $service->kind,
                'available' => $available,
                'pax' => $service->pax,
                'weekday_price' => (float) $service->price,
                'weekend_price' => $service->weekend_price !== null
                    ? (float) $service->weekend_price
                    : null,
            ];
        })->values()->all();

        return [
            'requested_label' => $label,
            'check_in' => $checkInDate,
            'check_out' => $checkOutDate,
            'nights' => max(1, (int) $checkIn->diffInDays($checkOut)),
            'as_of' => $today->toDateString(),
            'basis' => 'current confirmed bookings',
            'results' => $results,
        ];
    }

    /**
     * @return array{0: Carbon, 1: Carbon, 2: string}|null
     */
    private function requestedRange(string $message, Carbon $today): ?array
    {
        $text = Str::lower($message);

        if (preg_match('/\btomorrow\b/u', $text) === 1) {
            $checkIn = $today->copy()->addDay();

            return [$checkIn, $checkIn->copy()->addDay(), 'tomorrow night'];
        }

        if (preg_match('/\btonight\b/u', $text) === 1) {
            $checkIn = $today->copy();

            return [$checkIn, $checkIn->copy()->addDay(), 'tonight'];
        }

        if (preg_match('/\btoday\b/u', $text) === 1) {
            $checkIn = $today->copy();

            return [$checkIn, $checkIn->copy()->addDay(), 'today'];
        }

        return null;
    }

    /**
     * @return array{type: string, value: float}|null
     */
    private function discount(?string $type, mixed $value): ?array
    {
        if ($type === null || $value === null) {
            return null;
        }

        return [
            'type' => $type,
            'value' => (float) $value,
        ];
    }
}
