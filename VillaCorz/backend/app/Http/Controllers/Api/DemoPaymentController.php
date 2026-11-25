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
            'returnUrl' => $this->safeReturnUrl(request()->query('return_url'))
                ?: (string) config('app.frontend_url'),
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

        $returnUrl = $this->safeReturnUrl($request->input('return_url'));
        $redirect = $returnUrl
            ? redirect()->to($returnUrl)
            : redirect()->route('pay.show', ['token' => $token]);

        if ($result['conflict']) {
            return $redirect->with(
                'payment_error',
                $result['message'] ?? 'Those dates are no longer available.',
            );
        }

        return $redirect;
    }

    private function safeReturnUrl(mixed $returnUrl): ?string
    {
        if (! is_string($returnUrl) || $returnUrl === '') {
            return null;
        }

        $parts = parse_url($returnUrl);
        $frontendParts = parse_url((string) config('app.frontend_url'));

        if (! is_array($parts) || ! is_array($frontendParts)) {
            return null;
        }

        if (! isset($parts['scheme'], $parts['host'])
            || ! in_array(strtolower($parts['scheme']), ['http', 'https'], true)) {
            return null;
        }

        if (strtolower($parts['host']) !== strtolower((string) ($frontendParts['host'] ?? ''))) {
            return null;
        }

        if (($parts['port'] ?? null) !== ($frontendParts['port'] ?? null)) {
            return null;
        }

        $path = (string) ($parts['path'] ?? '/');

        if (! str_starts_with($path, '/payment/') && $path !== '/bookings') {
            return null;
        }

        return $returnUrl;
    }

    private function findPayment(string $token): Payment
    {
        return Payment::query()
            ->where('qr_token_hash', hash('sha256', $token))
            ->with(['booking.rooms'])
            ->firstOrFail();
    }
}
