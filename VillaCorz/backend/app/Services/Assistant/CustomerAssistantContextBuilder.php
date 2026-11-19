<?php

namespace App\Services\Assistant;

use App\Models\Booking;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Str;

class CustomerAssistantContextBuilder
{
    private const MAX_UPCOMING_BOOKINGS = 5;

    private const MAX_RECENT_BOOKINGS = 5;

    private const MAX_SERVICES = 20;

    private const DESCRIPTION_LIMIT = 240;

    /**
     * @return array<string, mixed>
     */
    public function build(User $user, string $page): array
    {
        $today = now()->startOfDay();

        $upcoming = Booking::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['pending_payment', 'confirmed'])
            ->whereDate('check_out', '>=', $today->toDateString())
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

        return [
            'today' => $today->toDateString(),
            'page' => $page,
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
    }

    /**
     * @return array<string, mixed>
     */
    private function bookingSummary(Booking $booking, Carbon $today): array
    {
        $checkIn = $booking->check_in?->copy()->startOfDay();
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
            'check_in' => $booking->check_in?->format('Y-m-d'),
            'check_out' => $booking->check_out?->format('Y-m-d'),
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
