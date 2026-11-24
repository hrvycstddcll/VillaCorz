<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\PaymentEvent;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class VillaRoomConflictResolver
{
    public function __construct(
        private readonly BookingAvailability $availability,
    ) {}

    /**
     * @return Collection<int, Booking>
     */
    public function conflicts(
        Booking $villa,
        ?CarbonImmutable $from = null,
        bool $lockForUpdate = false,
    ): Collection {
        return $this->availability->activeConflictingRoomBookings(
            $villa,
            $from,
            $lockForUpdate,
        );
    }

    public function cancelRoomBooking(
        Booking $villa,
        Booking $roomBooking,
        string $actor = 'system',
    ): bool {
        if (! in_array($roomBooking->status, ['confirmed', 'pending_payment'], true)) {
            return false;
        }

        $roomPayment = $roomBooking->payment;

        $roomBooking->forceFill(['status' => 'cancelled'])->save();

        if ($roomPayment && $roomPayment->status !== 'cancelled') {
            $roomPayment->forceFill(['status' => 'cancelled'])->save();
        }

        PaymentEvent::record(
            'payment_conflict',
            $roomPayment,
            $roomBooking,
            $actor,
            [
                'message' => 'Cancelled because the whole villa was reserved for the same dates.',
                'prioritized_booking_id' => $villa->id,
                'prioritized_booking_reference' => $villa->reference,
            ],
        );

        return true;
    }
}
