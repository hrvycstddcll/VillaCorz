<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Service;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingAvailability
{
    /**
     * Reject a booking when any requested room is already confirmed for the
     * dates.
     *
     * Pending payments deliberately do not hold inventory: a reservation only
     * takes the slot once the guest has scanned the QR and confirmed payment.
     * Confirmation re-runs this check so the first guest to confirm wins.
     *
     * @param  array<int, int>  $serviceIds
     */
    public function assertAvailable(
        array $serviceIds,
        string $checkIn,
        string $checkOut,
        ?int $exclusiveServiceId = null,
        ?int $ignoreBookingId = null,
    ): void {
        $serviceIds = array_values(array_unique(array_map('intval', $serviceIds)));
        $requestsExclusive = $exclusiveServiceId !== null
            && in_array($exclusiveServiceId, $serviceIds, true);

        $query = DB::table('booking_rooms')
            ->join('bookings', 'bookings.id', '=', 'booking_rooms.booking_id')
            ->where('bookings.status', 'confirmed')
            ->where('bookings.check_in', '<', $checkOut)
            ->where('bookings.check_out', '>', $checkIn);

        if ($ignoreBookingId !== null) {
            $query->where('bookings.id', '!=', $ignoreBookingId);
        }

        if ($requestsExclusive) {
            // The whole villa cannot overlap with any room or villa booking.
            $query->whereNotNull('booking_rooms.service_id');
        } else {
            $blockingIds = $serviceIds;

            if ($exclusiveServiceId !== null) {
                // A room booking also blocks the whole villa.
                $blockingIds[] = $exclusiveServiceId;
            }

            $query->whereIn('booking_rooms.service_id', array_values(array_unique($blockingIds)));
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'rooms' => 'One or more selected rooms are no longer available for those dates.',
            ]);
        }
    }

    /**
     * Re-check a booking at payment time, ignoring its own room rows.
     */
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

        $this->assertAvailable(
            $serviceIds,
            $booking->check_in->toDateString(),
            $booking->check_out->toDateString(),
            $exclusiveServiceId !== null ? (int) $exclusiveServiceId : null,
            $booking->id,
        );
    }
}