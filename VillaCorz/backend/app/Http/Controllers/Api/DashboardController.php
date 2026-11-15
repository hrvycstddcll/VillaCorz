<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\CancellationRequest;
use App\Models\ContactSubmission;
use App\Models\PageView;
use App\Models\Payment;
use App\Models\Service;
use App\Models\ServiceReview;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private const ALLOWED_RANGES = [7, 30, 90];

    public function summary(Request $request): JsonResponse
    {
        $range = (int) $request->integer('range', 30);
        if (! in_array($range, self::ALLOWED_RANGES, true)) {
            $range = 30;
        }

        $start = now()->startOfDay()->subDays($range - 1);
        $end = now()->endOfDay();

        $prevEnd = $start->copy()->subDay()->endOfDay();
        $prevStart = $prevEnd->copy()->startOfDay()->subDays($range - 1);

        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        // --- Current window metrics ---
        $revenue = (float) Payment::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->sum('amount');

        $paidCount = Payment::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->count();

        $checkIns = Booking::query()
            ->whereIn('status', ['confirmed', 'completed'])
            ->whereBetween('check_in', [$startDate, $endDate])
            ->count();

        $newBookings = Booking::query()
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $newUsers = User::query()
            ->where('role', 'customer')
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $websiteVisits = PageView::query()
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $revenueByWeekday = array_fill(0, 7, 0.0);
        Payment::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->get(['amount', 'paid_at'])
            ->each(function (Payment $payment) use (&$revenueByWeekday) {
                if ($payment->paid_at !== null) {
                    $weekday = Carbon::parse($payment->paid_at)->dayOfWeek;
                    $revenueByWeekday[$weekday] += (float) $payment->amount;
                }
            });

        $services = Service::query()
            ->withAvg('reviews as rating_average', 'rating')
            ->withCount(['reviews as reviews_count'])
            ->get(['id', 'name', 'kind', 'status']);
        $offerMetrics = $services->map(function (Service $service) use ($range, $start, $end) {
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

        $paidStayRooms = BookingRoom::query()
            ->whereHas('booking', function ($query) use ($start, $end) {
                $query->where('status', 'confirmed')
                    ->whereDate('check_in', '<', $end->toDateString())
                    ->whereDate('check_out', '>', $start->toDateString())
                    ->whereHas('payments', fn ($paymentQuery) => $paymentQuery->where('status', 'paid'));
            })
            ->with('booking:id,nights,check_in,check_out')
            ->get();
        $occupiedRoomNights = $paidStayRooms->sum(function (BookingRoom $room) use ($start, $end) {
            $booking = $room->booking;
            if ($booking === null) {
                return 0;
            }

            $occupiedFrom = max($start->toDateString(), $booking->check_in->toDateString());
            $occupiedUntil = min($end->toDateString(), $booking->check_out->toDateString());

            return max(0, Carbon::parse($occupiedFrom)->diffInDays(Carbon::parse($occupiedUntil)));
        });
        $stayRevenue = $paidStayRooms->sum(function (BookingRoom $room) use ($start, $end) {
            $booking = $room->booking;
            if ($booking === null || (int) $booking->nights < 1) {
                return 0;
            }

            $occupiedFrom = max($start->toDateString(), $booking->check_in->toDateString());
            $occupiedUntil = min($end->toDateString(), $booking->check_out->toDateString());
            $nightsInRange = max(0, Carbon::parse($occupiedFrom)->diffInDays(Carbon::parse($occupiedUntil)));

            return (float) $room->line_total * ($nightsInRange / $booking->nights);
        });
        $activeServiceCount = $services->where('status', 'active')->count();
        $availableRoomNights = $activeServiceCount * $range;
        $bookedForwardRevenue = (float) Payment::query()
            ->where('status', 'paid')
            ->whereHas('booking', function ($query) {
                $query->where('status', 'confirmed')
                    ->whereBetween('check_in', [now()->toDateString(), now()->addDays(30)->toDateString()]);
            })
            ->sum('amount');

        $availabilityBookings = BookingRoom::query()
            ->whereHas('booking', function ($query) {
                $query->where('status', 'confirmed')
                    ->whereDate('check_in', '<', now()->addDays(30)->toDateString())
                    ->whereDate('check_out', '>', now()->toDateString());
            })
            ->with('booking:id,check_in,check_out')
            ->get(['service_id', 'booking_id']);
        $availability = $availabilityBookings
            ->filter(fn (BookingRoom $room) => $room->service_id !== null && $room->booking !== null)
            ->groupBy('service_id')
            ->map(fn ($rooms) => $rooms->map(fn (BookingRoom $room) => [
                'check_in' => $room->booking->check_in->toDateString(),
                'check_out' => $room->booking->check_out->toDateString(),
            ])->values())
            ->all();

        $actionCenter = [
            'pending_cancellations' => CancellationRequest::query()->where('status', 'pending')->count(),
            'unpublished_reviews' => ServiceReview::query()->where('status', 'pending')->count(),
            'contact_messages' => ContactSubmission::query()->whereNull('read_at')->count(),
            'expired_payments' => Payment::query()
                ->where(function ($query) {
                    $query->where('status', 'expired')
                        ->orWhere(function ($pendingQuery) {
                            $pendingQuery->where('status', 'pending')
                                ->whereNotNull('qr_expires_at')
                                ->where('qr_expires_at', '<', now());
                        });
                })
                ->count(),
        ];

        // --- Previous window metrics (for deltas) ---
        $prevRevenue = (float) Payment::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$prevStart, $prevEnd])
            ->sum('amount');

        $prevCheckIns = Booking::query()
            ->whereIn('status', ['confirmed', 'completed'])
            ->whereBetween('check_in', [$prevStart->toDateString(), $prevEnd->toDateString()])
            ->count();

        $prevNewBookings = Booking::query()
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();

        $prevNewUsers = User::query()
            ->where('role', 'customer')
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();

        $prevWebsiteVisits = PageView::query()
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();

        $comparison = [
            'revenue' => $this->delta($revenue, $prevRevenue),
            'check_ins' => $this->delta($checkIns, $prevCheckIns),
            'new_bookings' => $this->delta($newBookings, $prevNewBookings),
            'new_users' => $this->delta($newUsers, $prevNewUsers),
            'website_visits' => $this->delta($websiteVisits, $prevWebsiteVisits),
        ];

        // --- Per-day series for the chart ---
        $bookingsByDay = Booking::query()
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('day')
            ->pluck('total', 'day');

        $revenueByDay = Payment::query()
            ->selectRaw('DATE(paid_at) as day, COALESCE(SUM(amount), 0) as total')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->groupBy('day')
            ->pluck('total', 'day');

        $visitsByDay = PageView::query()
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('day')
            ->pluck('total', 'day');

        $series = [];
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $day = $cursor->toDateString();
            $series[] = [
                'date' => $day,
                'bookings' => (int) ($bookingsByDay[$day] ?? 0),
                'revenue' => (float) ($revenueByDay[$day] ?? 0),
                'visits' => (int) ($visitsByDay[$day] ?? 0),
            ];
            $cursor->addDay();
        }

        // --- Top services by bookings in the selected window ---
        $topServices = $offerMetrics
            ->sortByDesc('bookings')
            ->take(5)
            ->values();

        // --- Recent bookings table ---
        $recentBookings = Booking::query()
            ->with(['user:id,firstname,lastname,email', 'rooms', 'payment'])
            ->latest('created_at')
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(function (Booking $booking) {
                return [
                    'reference' => $booking->reference,
                    'guest' => $booking->user
                        ? trim($booking->user->firstname . ' ' . $booking->user->lastname)
                        : $booking->contact_name,
                    'email' => $booking->user?->email ?? $booking->contact_email,
                    'stay' => $booking->rooms->pluck('service_name')->filter()->values()->all(),
                    'status' => $booking->status,
                    'lifecycle' => $booking->lifecycle,
                    'total' => (float) $booking->total,
                    'currency' => $booking->currency,
                    'payment_status' => $booking->payment?->status,
                    'created_at' => $booking->created_at?->toIso8601String(),
                    'check_in' => $booking->check_in?->toDateString(),
                    'check_out' => $booking->check_out?->toDateString(),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'range' => $range,
                'start' => $startDate,
                'end' => $endDate,
                'metrics' => [
                    'revenue' => $revenue,
                    'paid_count' => $paidCount,
                    'check_ins' => $checkIns,
                    'new_bookings' => $newBookings,
                    'new_users' => $newUsers,
                    'website_visits' => $websiteVisits,
                ],
                'comparison' => $comparison,
                'series' => $series,
                'top_services' => $topServices,
                'recent_bookings' => $recentBookings,
                'action_center' => $actionCenter,
                'revenue_by_weekday' => $revenueByWeekday,
                'offer_metrics' => $offerMetrics,
                'availability' => $availability,
                'operational' => [
                    'occupancy' => $availableRoomNights > 0
                        ? round(($occupiedRoomNights / $availableRoomNights) * 100, 1)
                        : 0,
                    'adr' => $occupiedRoomNights > 0
                        ? round($stayRevenue / $occupiedRoomNights, 2)
                        : 0,
                    'revpar' => $availableRoomNights > 0
                        ? round($stayRevenue / $availableRoomNights, 2)
                        : 0,
                    'booked_forward_revenue' => $bookedForwardRevenue,
                ],
            ],
        ]);
    }

    public function trackPageView(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'path' => ['required', 'string', 'max:255'],
            'referrer' => ['nullable', 'string', 'max:512'],
        ]);

        $sessionHash = hash('sha256', (string) $request->ip() . '|' . (string) $request->userAgent());

        PageView::create([
            'path' => $validated['path'],
            'session_hash' => $sessionHash,
            'referrer' => $validated['referrer'] ?? null,
        ]);

        return response()->json(['success' => true], 201);
    }

    /**
     * @return array{current: float|int, previous: float|int, delta: float|int, percent: float|null}
     */
    private function delta($current, $previous): array
    {
        $delta = $current - $previous;
        $percent = $previous != 0 ? round(($delta / $previous) * 100, 1) : null;

        return [
            'current' => $current,
            'previous' => $previous,
            'delta' => $delta,
            'percent' => $percent,
        ];
    }
}
