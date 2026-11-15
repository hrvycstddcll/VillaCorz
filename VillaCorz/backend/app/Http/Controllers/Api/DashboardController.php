<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\PageView;
use App\Models\Payment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        // Revenue: paid payments inside the range.
        $revenue = (float) Payment::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->sum('amount');

        $paidCount = Payment::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->count();

        // Check-ins: bookings whose check-in falls inside the range.
        $checkIns = Booking::query()
            ->whereIn('status', ['confirmed', 'completed'])
            ->whereBetween('check_in', [$startDate, $endDate])
            ->count();

        // New bookings created inside the range.
        $newBookings = Booking::query()
            ->whereBetween('created_at', [$start, $end])
            ->count();

        // New customers registered inside the range.
        $newUsers = User::query()
            ->where('role', 'customer')
            ->whereBetween('created_at', [$start, $end])
            ->count();

        // Website visits inside the range.
        $websiteVisits = PageView::query()
            ->whereBetween('created_at', [$start, $end])
            ->count();

        // Per-day series for the chart.
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

        // Recent bookings table.
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
                'series' => $series,
                'recent_bookings' => $recentBookings,
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
}
