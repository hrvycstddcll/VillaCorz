<?php

namespace App\Services;

use App\Mail\ReservationConfirmed;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class PaymentConfirmationService
{
    public function __construct(
        private readonly BookingAvailability $availability,
    ) {}

    /**
     * Confirm a demo payment exactly once.
     *
     * Availability is re-checked here rather than held at booking time, so a
     * reservation only takes its rooms after the guest scans the QR and taps
     * confirm. The first guest to confirm wins; the other booking is cancelled
     * without being marked paid or emailed.
     *
     * The caller may retry this method as often as it likes: the row lock and
     * the conditional status transition guarantee a single paid payment and a
     * single confirmation email.
     *
     * @return array{payment: Payment, transitioned: bool, expired: bool, already_paid: bool, conflict: bool, message: ?string}
     */
    public function confirm(
        Payment $payment,
        string $actor = 'system',
        ?string $idempotencyKey = null,
        ?Request $request = null,
    ): array {
        $result = DB::transaction(function () use ($payment, $actor, $idempotencyKey, $request) {
            /** @var Payment $payment */
            $payment = Payment::query()
                ->with('booking.rooms')
                ->lockForUpdate()
                ->findOrFail($payment->id);

            if ($payment->status === 'paid') {
                PaymentEvent::record(
                    'confirm_duplicate',
                    $payment,
                    $payment->booking,
                    $actor,
                    ['message' => 'Payment was already confirmed.'],
                    $idempotencyKey,
                    $request,
                );

                return [
                    'payment' => $payment,
                    'transitioned' => false,
                    'expired' => false,
                    'already_paid' => true,
                    'conflict' => false,
                    'message' => null,
                ];
            }

            if ($payment->isExpired()) {
                if ($payment->status === 'pending') {
                    $payment->markExpired();

                    PaymentEvent::record(
                        'payment_expired',
                        $payment,
                        $payment->booking,
                        'system',
                        ['qr_expires_at' => $payment->qr_expires_at?->toIso8601String()],
                        $idempotencyKey,
                        $request,
                    );
                }

                return [
                    'payment' => $payment,
                    'transitioned' => false,
                    'expired' => true,
                    'already_paid' => false,
                    'conflict' => false,
                    'message' => null,
                ];
            }

            if ($payment->status === 'cancelled') {
                return [
                    'payment' => $payment,
                    'transitioned' => false,
                    'expired' => false,
                    'already_paid' => false,
                    'conflict' => true,
                    'message' => 'This reservation is no longer available.',
                ];
            }

            $booking = $payment->booking;

            if ($booking && $booking->status !== 'confirmed') {
                // Lock the room rows so two phones confirming overlapping
                // reservations cannot both pass the availability check.
                Service::query()->lockForUpdate()->get(['id']);

                try {
                    $this->availability->assertBookingAvailable($booking);
                } catch (ValidationException $exception) {
                    $message = $exception->validator->errors()->first('rooms')
                        ?: 'One or more selected rooms are no longer available for those dates.';

                    $payment->forceFill(['status' => 'cancelled'])->save();
                    $booking->forceFill(['status' => 'cancelled'])->save();

                    PaymentEvent::record(
                        'payment_conflict',
                        $payment,
                        $booking,
                        $actor,
                        ['message' => $message],
                        $idempotencyKey,
                        $request,
                    );

                    return [
                        'payment' => $payment,
                        'transitioned' => false,
                        'expired' => false,
                        'already_paid' => false,
                        'conflict' => true,
                        'message' => $message,
                    ];
                }
            }

            $payment->forceFill([
                'status' => 'paid',
                'paid_at' => now(),
            ])->save();

            $booking?->forceFill([
                'status' => 'confirmed',
                'confirmed_at' => now(),
            ])->save();

            PaymentEvent::record(
                'payment_paid',
                $payment,
                $booking,
                $actor,
                [
                    'amount' => (string) $payment->amount,
                    'method' => $payment->method,
                    'reference' => $payment->reference,
                ],
                $idempotencyKey,
                $request,
            );

            return [
                'payment' => $payment,
                'transitioned' => true,
                'expired' => false,
                'already_paid' => false,
                'conflict' => false,
                'message' => null,
            ];
        });

        $payment = $result['payment']->fresh(['booking.rooms']);

        if ($payment->status === 'paid') {
            $this->sendConfirmationEmail($payment);

            // Pick up the email claim so the caller's status payload reports
            // the real delivery state instead of the pre-send relation.
            $payment = $payment->fresh(['booking.rooms']);
        }

        return [
            'payment' => $payment,
            'transitioned' => $result['transitioned'],
            'expired' => $result['expired'],
            'already_paid' => $result['already_paid'],
            'conflict' => $result['conflict'],
            'message' => $result['message'],
        ];
    }

    /**
     * Send the villa confirmation email once per booking.
     */
    public function sendConfirmationEmail(Payment $payment): void
    {
        $booking = $payment->booking()->with('rooms')->first();

        if (! $booking || ! $booking->contact_email || $booking->confirmation_email_sent_at) {
            return;
        }

        // Claim the email before sending. Concurrent duplicate confirmations
        // then see the timestamp and skip the second send.
        $claimed = Booking::query()
            ->whereKey($booking->id)
            ->whereNull('confirmation_email_sent_at')
            ->update(['confirmation_email_sent_at' => now()]);

        if ($claimed === 0) {
            return;
        }

        try {
            Mail::to($booking->contact_email, $booking->contact_name)
                ->send(new ReservationConfirmed($booking));

            PaymentEvent::record(
                'email_sent',
                $payment,
                $booking,
                'system',
                ['email' => $booking->contact_email],
            );
        } catch (Throwable $exception) {
            report($exception);

            // Release the claim so a later retry can try again.
            Booking::query()
                ->whereKey($booking->id)
                ->update(['confirmation_email_sent_at' => null]);

            PaymentEvent::record(
                'email_failed',
                $payment,
                $booking,
                'system',
                [
                    'email' => $booking->contact_email,
                    'error' => $exception->getMessage(),
                ],
            );
        }
    }
}