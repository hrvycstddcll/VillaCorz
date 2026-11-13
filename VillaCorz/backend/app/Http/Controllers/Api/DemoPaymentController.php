<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\PaymentConfirmationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DemoPaymentController extends Controller
{
    public function show(string $token): View
    {
        $payment = $this->findPayment($token);

        return view('pay.show', [
            'payment' => $payment,
            'booking' => $payment->booking,
        ]);
    }

    public function confirm(
        Request $request,
        string $token,
        PaymentConfirmationService $confirmation,
    ): RedirectResponse {
        $payment = $this->findPayment($token);

        $idempotencyKey = trim((string) $request->input('idempotency_key', ''))
            ?: $payment->idempotency_key;

        $result = $confirmation->confirm($payment, 'phone', $idempotencyKey, $request);

        $redirect = redirect()->route('pay.show', ['token' => $token]);

        if ($result['conflict']) {
            return $redirect->with(
                'payment_error',
                $result['message'] ?? 'Those dates are no longer available.',
            );
        }

        return $redirect;
    }

    private function findPayment(string $token): Payment
    {
        return Payment::query()
            ->where('qr_token_hash', hash('sha256', $token))
            ->with(['booking.rooms'])
            ->firstOrFail();
    }
}
