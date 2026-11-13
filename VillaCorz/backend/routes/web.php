
<?php

use App\Http\Controllers\Api\DemoPaymentController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Small reachability check: open this from the phone to prove the phone can
// reach the Laravel server before scanning a payment QR code.
Route::get('/demo/health', function () {
    return response()->json([
        'status' => 'ok',
        'public_url' => config('payments.public_url'),
        'time' => now()->toIso8601String(),
    ]);
})->name('demo.health');

// The QR code opens this page on the guest's phone. It is intentionally
// rendered by Laravel so only the backend has to be reachable from a phone.
Route::get('/pay/{token}', [DemoPaymentController::class, 'show'])
    ->name('pay.show');

Route::post('/pay/{token}', [DemoPaymentController::class, 'confirm'])
    ->middleware('throttle:20,1')
    ->name('pay.confirm');
