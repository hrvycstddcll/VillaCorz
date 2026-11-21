<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\CancellationRequest;
use App\Models\ContactSubmission;
use App\Models\PageView;
use App\Models\Payment;
use App\Models\ServiceReview;
use App\Models\User;
use App\Queries\Offers\OfferMetricsQuery;
use App\Support\StayPolicy;
use Carbon\Carbon;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\HttpException;

class DashboardController extends Controller
{
    private const ALLOWED_RANGES = [7, 30, 90];

    private const ALLOWED_FORECAST_PRESETS = ['14', '30', '60'];

    private const ALLOWED_BACKTEST_RANGES = [7, 14, 30];

    private const FORECAST_FULL_DAYS = 60;

    private const RECENT_BOOKINGS_LIMIT = 20;

    public function summary(Request $request): JsonResponse
    {
        $range = (int) $request->integer('range', 30);
        if (! in_array($range, self::ALLOWED_RANGES, true)) {
            $range = 30;
        }

        $forecastPreset = (string) $request->input('forecast_preset', '30');
        if (! in_array($forecastPreset, self::ALLOWED_FORECAST_PRESETS, true)) {
            $forecastPreset = '30';
        }

        $backtestRange = (int) $request->integer('backtest_range', 14);
        if (! in_array($backtestRange, self::ALLOWED_BACKTEST_RANGES, true)) {
            $backtestRange = 14;
        }

        $includeHolidays = $request->boolean('include_holidays', true);
        $includeWeekends = $request->boolean('include_weekends', true);

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

        $cancelledBookings = Booking::query()
            ->whereBetween('created_at', [$start, $end])
            ->where('status', 'cancelled')
            ->count();

        $expiredPayments = Payment::query()
            ->whereBetween('created_at', [$start, $end])
            ->where('status', 'expired')
            ->count();

        $pendingPayments = Payment::query()
            ->whereBetween('created_at', [$start, $end])
            ->where('status', 'pending')
            ->count();

        $conversionRate = $newBookings > 0
            ? round(($paidCount / $newBookings) * 100, 1)
            : 0.0;
        $churnRate = $newBookings > 0
            ? round(($cancelledBookings / $newBookings) * 100, 1)
            : 0.0;
        $dropoffRate = $websiteVisits > 0
            ? round((max(0, $websiteVisits - $paidCount) / $websiteVisits) * 100, 1)
            : 0.0;

        $visitsToBookingDropoff = max(0, $websiteVisits - $newBookings);
        $bookingToPaidDropoff = max(0, $newBookings - $paidCount);
        $totalDropoff = $visitsToBookingDropoff + $bookingToPaidDropoff;
        $dropoffReasonTotal = $expiredPayments + $cancelledBookings + $pendingPayments;

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

        $offerMetricsQuery = app(OfferMetricsQuery::class);
        $services = $offerMetricsQuery->services();
        $offerMetrics = $offerMetricsQuery->metricsFor($services, $range, $start, $end);

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

        $availability = $offerMetricsQuery->availability();

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

        $prevPaidCount = Payment::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$prevStart, $prevEnd])
            ->count();

        $prevCancelledBookings = Booking::query()
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->where('status', 'cancelled')
            ->count();

        $prevConversionRate = $prevNewBookings > 0
            ? round(($prevPaidCount / $prevNewBookings) * 100, 1)
            : 0.0;
        $prevChurnRate = $prevNewBookings > 0
            ? round(($prevCancelledBookings / $prevNewBookings) * 100, 1)
            : 0.0;
        $prevDropoffRate = $prevWebsiteVisits > 0
            ? round((max(0, $prevWebsiteVisits - $prevPaidCount) / $prevWebsiteVisits) * 100, 1)
            : 0.0;

        $comparison = [
            'revenue' => $this->delta($revenue, $prevRevenue),
            'check_ins' => $this->delta($checkIns, $prevCheckIns),
            'new_bookings' => $this->delta($newBookings, $prevNewBookings),
            'new_users' => $this->delta($newUsers, $prevNewUsers),
            'website_visits' => $this->delta($websiteVisits, $prevWebsiteVisits),
            'conversion_rate' => $this->delta($conversionRate, $prevConversionRate),
            'churn_rate' => $this->delta($churnRate, $prevChurnRate),
            'dropoff_rate' => $this->delta($dropoffRate, $prevDropoffRate),
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
            ->limit(self::RECENT_BOOKINGS_LIMIT)
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
                    'cancelled_bookings' => $cancelledBookings,
                    'expired_payments' => $expiredPayments,
                    'pending_payments' => $pendingPayments,
                    'conversion_rate' => $conversionRate,
                    'churn_rate' => $churnRate,
                    'dropoff_rate' => $dropoffRate,
                ],
                'comparison' => $comparison,
                'funnel' => [
                    'visits' => $websiteVisits,
                    'bookings' => $newBookings,
                    'paid' => $paidCount,
                    'dropoff_total' => $totalDropoff,
                    'steps' => [
                        [
                            'key' => 'visits',
                            'label' => 'Site visits',
                            'count' => $websiteVisits,
                            'dropoff' => null,
                            'dropoff_rate' => null,
                        ],
                        [
                            'key' => 'bookings',
                            'label' => 'Bookings started',
                            'count' => $newBookings,
                            'dropoff' => $visitsToBookingDropoff,
                            'dropoff_rate' => $websiteVisits > 0
                                ? round(($visitsToBookingDropoff / $websiteVisits) * 100, 1)
                                : 0.0,
                        ],
                        [
                            'key' => 'paid',
                            'label' => 'Payments completed',
                            'count' => $paidCount,
                            'dropoff' => $bookingToPaidDropoff,
                            'dropoff_rate' => $newBookings > 0
                                ? round(($bookingToPaidDropoff / $newBookings) * 100, 1)
                                : 0.0,
                        ],
                    ],
                ],
                'dropoff_reasons' => [
                    [
                        'key' => 'expired_payments',
                        'label' => 'Expired payments',
                        'count' => $expiredPayments,
                        'share' => $dropoffReasonTotal > 0
                            ? round(($expiredPayments / $dropoffReasonTotal) * 100, 1)
                            : 0.0,
                    ],
                    [
                        'key' => 'cancelled_bookings',
                        'label' => 'Cancelled bookings',
                        'count' => $cancelledBookings,
                        'share' => $dropoffReasonTotal > 0
                            ? round(($cancelledBookings / $dropoffReasonTotal) * 100, 1)
                            : 0.0,
                    ],
                    [
                        'key' => 'pending_payments',
                        'label' => 'Unpaid at window end',
                        'count' => $pendingPayments,
                        'share' => $dropoffReasonTotal > 0
                            ? round(($pendingPayments / $dropoffReasonTotal) * 100, 1)
                            : 0.0,
                    ],
                ],
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
                'demand_forecast' => $this->buildDemandForecast(
                    $services,
                    $forecastPreset,
                    $backtestRange,
                    $includeHolidays,
                    $includeWeekends,
                ),
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
     * Build a daily room-night demand and occupancy forecast.
     */
    private function buildDemandForecast(
        $services,
        string $forecastPreset,
        int $backtestRange,
        bool $includeHolidays,
        bool $includeWeekends,
    ): array {
        $historyDays = 90;
        $history = $this->occupancyHistory($historyDays);
        $holidays = $this->philippineHolidays();
        $activeServiceCount = max(1, $services->where('status', 'active')->count());

        $forecastStart = now()->startOfDay()->addDay();
        $presetDays = max(1, (int) $forecastPreset);
        $forecastEnd = $forecastStart->copy()->addDays($presetDays - 1);

        $pythonForecast = $this->requestPythonForecast(
            $history,
            $holidays,
            $activeServiceCount,
            self::FORECAST_FULL_DAYS,
            $backtestRange,
            $includeHolidays,
            $includeWeekends,
        );

        $forecastStartKey = $forecastStart->toDateString();
        $forecastEndKey = $forecastEnd->toDateString();
        $selectedForecast = collect($pythonForecast['forecast'])
            ->filter(fn (array $day) => $day['date'] >= $forecastStartKey && $day['date'] <= $forecastEndKey)
            ->values();
        $peakDay = $selectedForecast->sortByDesc('expected_occupancy')->first();
        $multipliers = $pythonForecast['multipliers'];

        $holidayImpact = '+45% expected room-nights on holiday dates';
        if ($includeHolidays && $multipliers !== null) {
            $holidayImpact = sprintf(
                '%+d%% expected room-nights on holidays, learned from stay history',
                round(($multipliers['holiday'] - 1) * 100),
            );
        }

        $weekendImpact = '+22% expected room-nights Fri–Sun';
        if ($includeWeekends && $multipliers !== null) {
            $weekendImpact = sprintf(
                '%+d%% expected room-nights Fri–Sun, learned from stay history',
                round(($multipliers['weekend'] - 1) * 100),
            );
        }

        return [
            'model' => $pythonForecast['model'],
            'forecast_preset' => $forecastPreset,
            'forecast_window' => [
                'start' => $forecastStartKey,
                'end' => $forecastEndKey,
            ],
            'forecast' => $selectedForecast->all(),
            'holiday_days' => $selectedForecast->filter(fn ($day) => $day['holiday'] !== null)->count(),
            'average_forecast_occupancy' => round((float) ($selectedForecast->avg('expected_occupancy') ?? 0), 1),
            'expected_room_nights' => round((float) $selectedForecast->sum('expected_room_nights'), 1),
            'peak_day' => $peakDay === null ? null : [
                'date' => $peakDay['date'],
                'label' => $peakDay['label'],
                'expected_occupancy' => $peakDay['expected_occupancy'],
            ],
            'accuracy' => $pythonForecast['backtest'],
            'factors' => [
                [
                    'key' => 'history',
                    'label' => '90-day stay history',
                    'impact' => 'SARIMAX learns from occupied room-nights per day',
                ],
                [
                    'key' => 'holidays',
                    'label' => 'Philippine holidays',
                    'impact' => $includeHolidays ? $holidayImpact : 'Excluded from this forecast',
                ],
                [
                    'key' => 'weekends',
                    'label' => 'Weekend pattern',
                    'impact' => $includeWeekends ? $weekendImpact : 'Excluded from this forecast',
                ],
            ],
        ];
    }

    /**
     * Count paid-day windows by their PHT start date. The API keeps the
     * historical "bookings" key, but each unit is now a paid 22-hour stay.
     *
     * @return array<int, array{date: string, bookings: int}>
     */
    private function occupancyHistory(int $days): array
    {
        $start = now()->subDays($days - 1)->startOfDay();
        $startKey = $start->toDateString();
        $endKey = now()->toDateString();

        $bookingRooms = BookingRoom::query()
            ->whereHas('booking', function ($query) use ($startKey, $endKey) {
                $query->whereIn('status', ['confirmed', 'completed'])
                    ->whereDate('check_in', '<=', $endKey)
                    ->whereDate('check_out', '>=', $startKey)
                    ->whereHas('payments', fn ($paymentQuery) => $paymentQuery->where('status', 'paid'));
            })
            ->whereHas('service', fn ($serviceQuery) => $serviceQuery->where('status', 'active'))
            ->with('booking:id,check_in,check_out,paid_days,nights')
            ->get(['booking_id']);

        $counts = array_fill(0, $days, 0);
        foreach ($bookingRooms as $room) {
            $booking = $room->booking;
            if ($booking === null || $booking->check_in === null) {
                continue;
            }

            $paidDays = (int) ($booking->paid_days ?? 0);
            if ($paidDays < 1) {
                continue;
            }

            foreach (StayPolicy::windows($booking->check_in, $paidDays) as $window) {
                $index = (int) $start->diffInDays(Carbon::parse($window['date'])->startOfDay(), false);
                if ($index >= 0 && $index < $days) {
                    $counts[$index]++;
                }
            }
        }

        $history = [];
        for ($offset = 0; $offset < $days; $offset++) {
            $history[] = [
                'date' => $start->copy()->addDays($offset)->toDateString(),
                'bookings' => $counts[$offset],
            ];
        }

        return $history;
    }

    /**
     * Request and validate the required SARIMAX forecast from Python.
     *
     * @param  array<int, array{date: string, bookings: int}>  $history
     * @param  array<string, string>  $holidays
     * @return array{
     *     forecast: array<int, array<string, mixed>>,
     *     model: 'sarimax',
     *     backtest: array<string, mixed>|null,
     *     multipliers: array{weekend: float, holiday: float}|null
     * }
     */
    private function requestPythonForecast(
        array $history,
        array $holidays,
        int $activeServiceCount,
        int $horizon,
        int $backtestDays,
        bool $includeHolidays,
        bool $includeWeekends,
    ): array {
        $url = rtrim((string) config('forecasting.url'), '/');
        if ($url === '') {
            throw new HttpException(503, 'SARIMAX forecasting service is not configured.');
        }

        try {
            $response = Http::timeout(max(1, (int) config('forecasting.timeout', 4)))
                ->acceptJson()
                ->post($url.'/forecast', [
                    'history' => $history,
                    'holidays' => $holidays,
                    'active_services' => max(1, $activeServiceCount),
                    'horizon' => $horizon,
                    'backtest_days' => $backtestDays,
                    'include_holidays' => $includeHolidays,
                    'include_weekends' => $includeWeekends,
                    'as_of_date' => now()->toDateString(),
                ]);
        } catch (ConnectionException $exception) {
            throw new HttpException(503, 'SARIMAX forecasting service is unavailable.', $exception);
        }

        if (! $response->successful()) {
            throw new HttpException(503, 'SARIMAX forecasting service returned an error.');
        }

        $payload = $response->json();
        if (! is_array($payload) || ($payload['model'] ?? null) !== 'sarimax') {
            throw new HttpException(503, 'SARIMAX forecasting service returned an invalid model.');
        }

        $forecast = $payload['forecast'] ?? null;
        if (! is_array($forecast) || $forecast === []) {
            throw new HttpException(503, 'SARIMAX forecasting service returned no forecast.');
        }

        $normalized = [];
        foreach ($forecast as $point) {
            if (
                ! is_array($point)
                || ! isset($point['date'], $point['expected_bookings'], $point['expected_occupancy'])
                || ! is_numeric($point['expected_bookings'])
                || ! is_numeric($point['expected_occupancy'])
                || ! is_finite((float) $point['expected_bookings'])
                || ! is_finite((float) $point['expected_occupancy'])
            ) {
                throw new HttpException(503, 'SARIMAX forecasting service returned an invalid forecast.');
            }

            $date = Carbon::parse((string) $point['date']);
            $normalized[] = [
                'date' => $date->toDateString(),
                'label' => $date->format('M j'),
                'expected_room_nights' => round((float) $point['expected_bookings'], 1),
                'expected_occupancy' => round((float) $point['expected_occupancy'], 1),
                'factor' => round((float) ($point['factor'] ?? 1), 2),
                'is_weekend' => (bool) ($point['is_weekend'] ?? false),
                'holiday' => isset($point['holiday']) && $point['holiday'] !== ''
                    ? (string) $point['holiday']
                    : null,
            ];
        }

        $rawMultipliers = $payload['multipliers'] ?? null;
        $multipliers = null;
        if (is_array($rawMultipliers)) {
            $weekend = $rawMultipliers['weekend'] ?? null;
            $holiday = $rawMultipliers['holiday'] ?? null;
            $multipliers = [
                'weekend' => is_numeric($weekend) && is_finite((float) $weekend)
                    ? round((float) $weekend, 2)
                    : 1.22,
                'holiday' => is_numeric($holiday) && is_finite((float) $holiday)
                    ? round((float) $holiday, 2)
                    : 1.45,
            ];
        }

        $backtest = null;
        $rawBacktest = $payload['backtest'] ?? null;
        if ($rawBacktest !== null) {
            if (
                ! is_array($rawBacktest)
                || ($rawBacktest['model'] ?? null) !== 'sarimax'
                || ! is_array($rawBacktest['points'] ?? null)
            ) {
                throw new HttpException(503, 'SARIMAX forecasting service returned an invalid backtest.');
            }

            $backtestPoints = [];
            foreach ($rawBacktest['points'] as $point) {
                if (
                    ! is_array($point)
                    || ! isset($point['date'], $point['actual_bookings'], $point['predicted_bookings'])
                    || ! is_numeric($point['actual_bookings'])
                    || ! is_numeric($point['predicted_bookings'])
                    || ! is_finite((float) $point['actual_bookings'])
                    || ! is_finite((float) $point['predicted_bookings'])
                ) {
                    throw new HttpException(503, 'SARIMAX forecasting service returned an invalid backtest point.');
                }

                $date = Carbon::parse((string) $point['date']);
                $backtestPoints[] = [
                    'date' => $date->toDateString(),
                    'label' => $date->format('M j'),
                    'actual_room_nights' => round((float) $point['actual_bookings'], 1),
                    'predicted_room_nights' => round((float) $point['predicted_bookings'], 1),
                ];
            }

            if ($backtestPoints !== []) {
                $backtest = [
                    'window_days' => (int) ($rawBacktest['window_days'] ?? $backtestDays),
                    'model' => 'sarimax',
                    'mae' => round((float) ($rawBacktest['mae'] ?? 0), 2),
                    'mape' => isset($rawBacktest['mape']) && $rawBacktest['mape'] !== null
                        ? round((float) $rawBacktest['mape'], 1)
                        : null,
                    'wape' => isset($rawBacktest['wape']) && $rawBacktest['wape'] !== null
                        ? round((float) $rawBacktest['wape'], 1)
                        : null,
                    'points' => $backtestPoints,
                ];
            }
        }

        return [
            'forecast' => $normalized,
            'model' => 'sarimax',
            'backtest' => $backtest,
            'multipliers' => $multipliers,
        ];
    }

    /**
     * @return array<string, string>
     */
    private function philippineHolidays(): array
    {
        $holidays = [];
        $currentYear = (int) now()->year;

        foreach ([$currentYear, $currentYear + 1] as $year) {
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

            $easter = $this->easterDate($year);
            $holidays[$easter->copy()->subDays(3)->toDateString()] = 'Maundy Thursday';
            $holidays[$easter->copy()->subDays(2)->toDateString()] = 'Good Friday';
        }

        return $holidays;
    }

    private function easterDate(int $year): Carbon
    {
        $a = $year % 19;
        $b = intdiv($year, 100);
        $c = $year % 100;
        $d = intdiv($b, 4);
        $e = $b % 4;
        $f = intdiv($b + 8, 25);
        $g = intdiv($b - $f + 1, 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = intdiv($c, 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = intdiv($a + 11 * $h + 22 * $l, 451);
        $month = intdiv($h + $l - 7 * $m + 114, 31);
        $day = (($h + $l - 7 * $m + 114) % 31) + 1;

        return Carbon::createFromDate($year, $month, $day)->startOfDay();
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
