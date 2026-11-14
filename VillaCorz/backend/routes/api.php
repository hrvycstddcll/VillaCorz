
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PhoneNumberController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\ServiceReviewController;

// Authenticated user
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user()->accountPayload();
});

Route::middleware('auth:sanctum')->prefix('account')->group(function () {
    Route::put('/profile', [AccountController::class, 'updateProfile'])
        ->middleware('throttle:10,1');
    Route::put('/password', [AccountController::class, 'changePassword'])
        ->middleware('throttle:5,1');

    Route::get('/phone-numbers', [PhoneNumberController::class, 'index']);
    Route::post('/phone-numbers', [PhoneNumberController::class, 'store'])
        ->middleware('throttle:10,1');
    Route::put('/phone-numbers/{phoneNumber}', [PhoneNumberController::class, 'update'])
        ->middleware('throttle:10,1');
    Route::delete('/phone-numbers/{phoneNumber}', [PhoneNumberController::class, 'destroy']);
    Route::post('/phone-numbers/{phoneNumber}/verification', [PhoneNumberController::class, 'sendVerification'])
        ->middleware('throttle:3,1');
    Route::post('/phone-numbers/{phoneNumber}/verification/confirm', [PhoneNumberController::class, 'confirmVerification'])
        ->middleware('throttle:10,1');
});

Route::post('/forgot-password', [AccountController::class, 'sendPasswordResetCode'])
    ->middleware('throttle:3,1');

Route::post('/reset-password', [AccountController::class, 'resetPassword'])
    ->middleware('throttle:10,1');

// Registration and email verification
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:5,1');

Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])
    ->middleware('throttle:10,1');

Route::post('/resend-otp', [AuthController::class, 'resendOtp'])
    ->middleware('throttle:3,1');

// Login and logout
Route::post('/login', [AuthController::class, 'login']);

Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth:sanctum');

// Booking and demo payment flow
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store'])
        ->middleware('throttle:10,1');
    Route::get('/bookings/{reference}', [BookingController::class, 'show']);
    Route::post('/bookings/{reference}/cancel', [BookingController::class, 'cancel'])
        ->middleware('throttle:10,1');
    Route::post('/bookings/{reference}/cancel-request', [BookingController::class, 'requestCancellation'])
        ->middleware('throttle:5,1');

    Route::get('/payments/{reference}/status', [PaymentController::class, 'status']);
});

// Public service routes
Route::get('/services', [ServiceController::class, 'index']);
Route::get('/services/{id}', [ServiceController::class, 'show']);
Route::get('/services/{id}/reviews', [ServiceReviewController::class, 'index']);
Route::get('/services/{id}/can-review', [ServiceReviewController::class, 'canReview'])
    ->middleware('auth:sanctum');

// Authenticated review management
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/services/{id}/reviews', [ServiceReviewController::class, 'store'])
        ->middleware('throttle:5,1');
    Route::put('/reviews/{id}', [ServiceReviewController::class, 'update'])
        ->middleware('throttle:5,1');
    Route::delete('/reviews/{id}', [ServiceReviewController::class, 'destroy']);
});

// Admin-only service management
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/activity-logs/summary', [ActivityLogController::class, 'summary']);
    Route::get('/activity-logs/export', [ActivityLogController::class, 'export']);
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);

    Route::post('/services', [ServiceController::class, 'store']);
    Route::put('/services/{id}', [ServiceController::class, 'update']);
    Route::delete('/services/{id}', [ServiceController::class, 'destroy']);

    Route::patch('/reviews/{id}/status', [ServiceReviewController::class, 'setStatus']);
});

// Contact form
Route::post('/contact', ContactController::class)
    ->middleware('throttle:5,1');
