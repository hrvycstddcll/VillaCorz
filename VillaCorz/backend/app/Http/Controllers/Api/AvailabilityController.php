<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Services\BookingAvailability;
use App\Support\StayTime;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AvailabilityController extends Controller
{
    public function range(Request $request, BookingAvailability $availability): JsonResponse
    {
        $validated = $request->validate([
            'check_in' => ['required', 'string', function ($attribute, $value, $fail) {
                if (! StayTime::isValidApiValue($value)) {
                    $fail('The '.$attribute.' must be an ISO datetime or Y-m-d date.');
                }
            }],
            'check_out' => ['required', 'string', function ($attribute, $value, $fail) {
                if (! StayTime::isValidApiValue($value)) {
                    $fail('The '.$attribute.' must be an ISO datetime or Y-m-d date.');
                }
            }],
        ]);

        $checkIn = StayTime::parseApi($validated['check_in']);
        $checkOut = StayTime::parseApi($validated['check_out']);

        if (! $checkOut->greaterThan($checkIn)) {
            throw ValidationException::withMessages([
                'check_out' => 'The check-out must be later than the check-in.',
            ]);
        }

        if ($checkIn->lessThan(now()->utc())) {
            throw ValidationException::withMessages([
                'check_in' => 'The check-in must not be in the past.',
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'as_of' => now()->toIso8601String(),
                'basis' => 'confirmed bookings only',
                'check_in' => $checkIn->toIso8601String(),
                'check_out' => $checkOut->toIso8601String(),
                'rooms' => $availability->availabilityForRange($checkIn, $checkOut),
            ],
        ]);
    }

    public function blockedDates(
        Request $request,
        Service $service,
        BookingAvailability $availability,
    ): JsonResponse {
        $validated = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        $from = CarbonImmutable::createFromFormat('!Y-m-d H:i', $validated['from'].' 00:00', StayTime::TIMEZONE)->utc();
        $to = CarbonImmutable::createFromFormat('!Y-m-d H:i', $validated['to'].' 23:59', StayTime::TIMEZONE)->utc();

        if ($to->diffInDays($from) > 90) {
            throw ValidationException::withMessages([
                'to' => 'The date range must not exceed 90 days.',
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'as_of' => now()->toIso8601String(),
                'basis' => 'confirmed bookings only',
                'service_id' => (int) $service->id,
                'unavailable_dates' => $availability->unavailableDates($service, $from, $to),
            ],
        ]);
    }
}
