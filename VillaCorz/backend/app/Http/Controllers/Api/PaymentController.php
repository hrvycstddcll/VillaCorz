<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function status(Request $request, string $reference): JsonResponse
    {
        $payment = Payment::query()
            ->where('reference', $reference)
            ->with('booking')
            ->firstOrFail();

        $this->authorizeOwner($request, $payment);

        return response()->json([
            'success' => true,
            'data' => $this->statusPayload($payment),
        ]);
    }

    private function authorizeOwner(Request $request, Payment $payment): void
    {
        $user = $request->user();
        $booking = $payment->booking;

        if ($user?->role === 'admin') {
            return;
        }

        abort_unless($booking?->user_id === $user?->id, 403, 'You cannot view this payment.');
    }

    /**
     * @return array<string, mixed>
     */
    private function statusPayload(Payment $payment): array
    {
        return [
            'reference' => $payment->reference,
            'booking_reference' => $payment->booking?->reference,
            'status' => $payment->status,
            'booking_status' => $payment->booking?->status,
            'amount' => (string) $payment->amount,
            'currency' => $payment->currency,
            'method' => $payment->method,
            'qr_url' => $payment->publicQrUrl(),
            'qr_expires_at' => $payment->qr_expires_at?->toIso8601String(),
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'is_expired' => $payment->isExpired(),
            'is_cancelled' => $payment->status === 'cancelled',
            'email_sent' => $payment->booking?->confirmation_email_sent_at !== null,
        ];
    }
}