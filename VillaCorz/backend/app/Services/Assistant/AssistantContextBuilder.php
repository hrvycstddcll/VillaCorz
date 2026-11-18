<?php

namespace App\Services\Assistant;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\CancellationRequest;
use App\Models\ContactSubmission;
use App\Models\PageView;
use App\Models\Payment;
use App\Models\ServiceReview;
use App\Models\User;
use App\Queries\Offers\OfferMetricsQuery;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class AssistantContextBuilder
{
    private const ALLOWED_REPORTS = [
        'revenue',
        'bookings',
        'cancellations',
        'reviews',
        'contacts',
        'payments',
        'guests',
        'traffic',
        'activity',
    ];

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    public function build(array $context): array
    {
        $page = $context['page'] ?? 'dashboard';
        $report = $context['report'] ?? null;

        $end = ! empty($context['to'])
            ? Carbon::parse((string) $context['to'])->endOfDay()
            : now()->endOfDay();

        $start = ! empty($context['from'])
            ? Carbon::parse((string) $context['from'])->startOfDay()
            : $end->copy()->startOfDay()->subDays(((int) ($context['range'] ?? 30) - 1));

        if ($end->lt($start)) {
            $start = $end->copy()->startOfDay();
        }

        $days = (int) $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1;
        if ($days > 90) {
            $start = $end->copy()->startOfDay()->subDays(89);
            $days = 90;
        }

        $prevEnd = $start->copy()->subDay()->endOfDay();
        $prevStart = $prevEnd->copy()->startOfDay()->subDays($days - 1);

        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

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

        $prevRevenue = (float) Payment::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$prevStart, $prevEnd])
            ->sum('amount');

        $prevPaidCount = Payment::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$prevStart, $prevEnd])
            ->count();

        $prevNewBookings = Booking::query()
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();

        $prevCheckIns = Booking::query()
            ->whereIn('status', ['confirmed', 'completed'])
            ->whereBetween('check_in', [$prevStart->toDateString(), $prevEnd->toDateString()])
            ->count();

        $prevWebsiteVisits = PageView::query()
            ->whereBetween('created_at', [$prevStart, $prevEnd])
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

        $seriesStart = $end->copy()->subDays(29);
        if ($seriesStart->lt($start)) {
            $seriesStart = $start->copy();
        }

        $bookingsByDay = Booking::query()
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->whereBetween('created_at', [$seriesStart, $end])
            ->groupBy('day')
            ->pluck('total', 'day');

        $revenueByDay = Payment::query()
            ->selectRaw('DATE(paid_at) as day, COALESCE(SUM(amount), 0) as total')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$seriesStart, $end])
            ->groupBy('day')
            ->pluck('total', 'day');

        $visitsByDay = PageView::query()
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->whereBetween('created_at', [$seriesStart, $end])
            ->groupBy('day')
            ->pluck('total', 'day');

        $series = [];
        $cursor = $seriesStart->copy();
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

        $offerMetricsQuery = app(OfferMetricsQuery::class);
        $services = $offerMetricsQuery->services();
        $offerMetrics = $offerMetricsQuery->metricsFor($services, $days, $start, $end);
        $topServices = $offerMetrics
            ->sortByDesc('bookings')
            ->take(5)
            ->map(fn (array $metric) => [
                'name' => $metric['name'],
                'bookings' => $metric['bookings'],
                'revenue' => $metric['revenue'],
                'occupancy' => $metric['occupancy'],
                'rating' => $metric['rating'],
            ])
            ->values()
            ->all();

        $actionCenter = [
            'pending_cancellations' => CancellationRequest::query()->where('status', 'pending')->count(),
            'unpublished_reviews' => ServiceReview::query()->where('status', 'pending')->count(),
            'unread_contact_messages' => ContactSubmission::query()->whereNull('read_at')->count(),
            'expired_or_stale_payments' => Payment::query()
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

        $visitsToBookingDropoff = max(0, $websiteVisits - $newBookings);
        $bookingToPaidDropoff = max(0, $newBookings - $paidCount);

        return [
            'window' => [
                'start' => $startDate,
                'end' => $endDate,
                'days' => $days,
                'capped_to_90_days' => $startDate !== ($context['from'] ?? $startDate),
            ],
            'page' => $page,
            'metrics' => [
                'revenue' => $revenue,
                'paid_count' => $paidCount,
                'check_ins' => $checkIns,
                'new_bookings' => $newBookings,
                'new_customers' => $newUsers,
                'website_visits' => $websiteVisits,
                'cancelled_bookings' => $cancelledBookings,
                'expired_payments' => $expiredPayments,
                'pending_payments' => $pendingPayments,
                'conversion_rate_percent' => $conversionRate,
                'churn_rate_percent' => $churnRate,
            ],
            'comparison_to_previous_window' => [
                'revenue' => $this->delta($revenue, $prevRevenue),
                'paid_count' => $this->delta($paidCount, $prevPaidCount),
                'new_bookings' => $this->delta($newBookings, $prevNewBookings),
                'check_ins' => $this->delta($checkIns, $prevCheckIns),
                'website_visits' => $this->delta($websiteVisits, $prevWebsiteVisits),
                'conversion_rate_percent' => $this->delta($conversionRate, $prevConversionRate),
                'churn_rate_percent' => $this->delta($churnRate, $prevChurnRate),
            ],
            'funnel' => [
                'visits' => $websiteVisits,
                'bookings_started' => $newBookings,
                'payments_completed' => $paidCount,
                'visits_to_booking_dropoff' => $visitsToBookingDropoff,
                'booking_to_payment_dropoff' => $bookingToPaidDropoff,
            ],
            'daily_series_last_30_days' => $series,
            'top_services' => $topServices,
            'action_center_counts' => $actionCenter,
            'selected_report' => $this->reportSummary(
                in_array($report, self::ALLOWED_REPORTS, true) ? (string) $report : null,
                $start,
                $end,
            ),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function delta(float|int $current, float|int $previous): array
    {
        $current = (float) $current;
        $previous = (float) $previous;
        $delta = round($current - $previous, 2);
        $percent = $previous != 0.0
            ? round(($delta / abs($previous)) * 100, 1)
            : ($current > 0.0 ? 100.0 : 0.0);

        return [
            'current' => $current,
            'previous' => $previous,
            'delta' => $delta,
            'percent' => $percent,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function reportSummary(?string $report, Carbon $start, Carbon $end): ?array
    {
        if ($report === null) {
            return null;
        }

        $summary = ['report' => $report, 'total' => 0, 'amount' => 0.0, 'breakdown' => []];

        switch ($report) {
            case 'revenue':
                $query = Payment::query()
                    ->where('status', 'paid')
                    ->whereBetween('paid_at', [$start, $end]);
                $summary['total'] = $query->count();
                $summary['amount'] = (float) $query->sum('amount');
                break;

            case 'payments':
                $query = Payment::query()->whereBetween('created_at', [$start, $end]);
                $summary['total'] = $query->count();
                $summary['amount'] = (float) (clone $query)->where('status', 'paid')->sum('amount');
                $summary['breakdown'] = $this->statusBreakdown(clone $query);
                break;

            case 'bookings':
                $query = Booking::query()->whereBetween('created_at', [$start, $end]);
                $summary['total'] = $query->count();
                $summary['amount'] = (float) $query->sum('total');
                $summary['breakdown'] = $this->statusBreakdown(clone $query);
                break;

            case 'cancellations':
                $query = CancellationRequest::query()->whereBetween('created_at', [$start, $end]);
                $summary['total'] = $query->count();
                $summary['breakdown'] = $this->statusBreakdown(clone $query);
                break;

            case 'reviews':
                $query = ServiceReview::query()->whereBetween('created_at', [$start, $end]);
                $summary['total'] = $query->count();
                $summary['average_rating'] = (float) $query->avg('rating');
                $summary['breakdown'] = $this->statusBreakdown(clone $query);
                break;

            case 'contacts':
                $query = ContactSubmission::query()->whereBetween('created_at', [$start, $end]);
                $summary['total'] = $query->count();
                $summary['unread'] = (int) (clone $query)->whereNull('read_at')->count();
                break;

            case 'guests':
                $summary['total'] = User::query()
                    ->where('role', 'customer')
                    ->whereBetween('created_at', [$start, $end])
                    ->count();
                break;

            case 'traffic':
                $summary['total'] = PageView::query()
                    ->whereBetween('created_at', [$start, $end])
                    ->count();
                break;

            case 'activity':
                $query = ActivityLog::query()->whereBetween('created_at', [$start, $end]);
                $summary['total'] = $query->count();
                $summary['breakdown'] = $this->statusBreakdown(clone $query, 'action');
                break;
        }

        return $summary;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function statusBreakdown(Builder $query, string $column = 'status'): array
    {
        return $query
            ->selectRaw("{$column} as value, COUNT(*) as total")
            ->groupBy($column)
            ->orderByDesc('total')
            ->limit(6)
            ->pluck('total', 'value')
            ->map(fn ($total, $value) => [
                'value' => $value,
                'total' => (int) $total,
            ])
            ->values()
            ->all();
    }
}
