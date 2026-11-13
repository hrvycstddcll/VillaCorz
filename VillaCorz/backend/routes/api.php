
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ServiceController;

// Authenticated user
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware('auth:sanctum')->prefix('account')->group(function () {
    Route::put('/profile', [AccountController::class, 'updateProfile'])
        ->middleware('throttle:10,1');
    Route::put('/password', [AccountController::class, 'changePassword'])
        ->middleware('throttle:5,1');
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

// Public service routes
Route::get('/services', [ServiceController::class, 'index']);
Route::get('/services/{id}', [ServiceController::class, 'show']);

// Admin-only service management
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/activity-logs/summary', [ActivityLogController::class, 'summary']);
    Route::get('/activity-logs/export', [ActivityLogController::class, 'export']);
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);

    Route::post('/services', [ServiceController::class, 'store']);
    Route::put('/services/{id}', [ServiceController::class, 'update']);
    Route::delete('/services/{id}', [ServiceController::class, 'destroy']);
});

// Contact form
Route::post('/contact', ContactController::class)
    ->middleware('throttle:5,1');
