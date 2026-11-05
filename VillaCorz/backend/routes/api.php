
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:5,1');

Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])
    ->middleware('throttle:10,1');

Route::post('/resend-otp', [AuthController::class, 'resendOtp'])
    ->middleware('throttle:3,1');

Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth:sanctum');

Route::post('/contact', ContactController::class)
    ->middleware('throttle:5,1');
