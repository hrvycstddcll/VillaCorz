<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'firstname' => 'required|string|max:255',
            'lastname' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
        ]);

        $registrationId = (string) Str::uuid();
        $otp = (string) random_int(100000, 999999);

        $cacheKey = "pending_registration:{$registrationId}";
        $attemptsKey = "pending_registration_attempts:{$registrationId}";

        Cache::put($cacheKey, [
            'firstname' => $validated['firstname'],
            'lastname' => $validated['lastname'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'otp_hash' => Hash::make($otp),
        ], now()->addMinutes(10));

        Cache::put($attemptsKey, 0, now()->addMinutes(10));

        try {
            Mail::raw(
                "Your VillaCorz verification code is: {$otp}\n\n"
                . "This code expires in 10 minutes. Do not share it with anyone.",
                function ($message) use ($validated) {
                    $message->to($validated['email'])
                        ->subject('VillaCorz Email Verification');
                }
            );
        } catch (Throwable $exception) {
            report($exception);

            Cache::forget($cacheKey);
            Cache::forget($attemptsKey);

            return response()->json([
                'message' => 'Unable to send the verification email. Please try again.',
            ], 500);
        }

        return response()->json([
            'message' => 'A verification code has been sent to your email.',
            'registration_id' => $registrationId,
            'expires_in' => 600,
        ], 200);
    }

    public function verifyOtp(Request $request)
    {
        $validated = $request->validate([
            'registration_id' => 'required|uuid',
            'otp' => 'required|string|digits:6',
        ]);

        $registrationId = $validated['registration_id'];

        $cacheKey = "pending_registration:{$registrationId}";
        $attemptsKey = "pending_registration_attempts:{$registrationId}";

        $pending = Cache::get($cacheKey);

        if (!$pending) {
            return response()->json([
                'message' => 'This registration has expired. Please register again.',
            ], 422);
        }

        $attempts = (int) Cache::get($attemptsKey, 0);

        if ($attempts >= 5) {
            Cache::forget($cacheKey);
            Cache::forget($attemptsKey);

            return response()->json([
                'message' => 'Too many incorrect attempts. Please register again.',
            ], 429);
        }

        if (!Hash::check($validated['otp'], $pending['otp_hash'])) {
            $attempts = Cache::increment($attemptsKey);

            if ($attempts >= 5) {
                Cache::forget($cacheKey);
                Cache::forget($attemptsKey);

                return response()->json([
                    'message' => 'Too many incorrect attempts. Please register again.',
                ], 429);
            }

            return response()->json([
                'message' => 'Invalid verification code.',
                'attempts_remaining' => 5 - $attempts,
            ], 422);
        }

        if (User::where('email', $pending['email'])->exists()) {
            Cache::forget($cacheKey);
            Cache::forget($attemptsKey);

            return response()->json([
                'message' => 'An account with this email already exists. Please log in.',
            ], 409);
        }

        $user = DB::transaction(function () use ($pending) {
            $user = User::create([
                'firstname' => $pending['firstname'],
                'lastname' => $pending['lastname'],
                'email' => $pending['email'],
                'password' => $pending['password'],
                'role' => 'customer',
            ]);

            $user->forceFill([
                'email_verified_at' => now(),
            ])->save();

            return $user;
        });

        Cache::forget($cacheKey);
        Cache::forget($attemptsKey);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Email verified and account created successfully.',
            'user' => [
                'id' => $user->id,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ], 201);
    }

    public function resendOtp(Request $request)
    {
        $validated = $request->validate([
            'registration_id' => 'required|uuid',
        ]);

        $registrationId = $validated['registration_id'];

        $cacheKey = "pending_registration:{$registrationId}";
        $attemptsKey = "pending_registration_attempts:{$registrationId}";

        $pending = Cache::get($cacheKey);

        if (!$pending) {
            return response()->json([
                'message' => 'This registration has expired. Please register again.',
            ], 422);
        }

        $otp = (string) random_int(100000, 999999);

        $pending['otp_hash'] = Hash::make($otp);

        Cache::put($cacheKey, $pending, now()->addMinutes(10));
        Cache::put($attemptsKey, 0, now()->addMinutes(10));

        try {
            Mail::raw(
                "Your VillaCorz verification code is: {$otp}\n\n"
                . "This code expires in 10 minutes. Do not share it with anyone.",
                function ($message) use ($pending) {
                    $message->to($pending['email'])
                        ->subject('VillaCorz Email Verification');
                }
            );
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Unable to send the verification email. Please try again.',
            ], 500);
        }

        return response()->json([
            'message' => 'A new verification code has been sent to your email.',
            'registration_id' => $registrationId,
            'expires_in' => 600,
        ], 200);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8',
        ]);

        if (!Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => 'Invalid email or password.',
            ]);
        }

        $request->session()->regenerate();

        $user = Auth::user();

        return response()->json([
            'message' => 'Login successful.',
            'user' => [
                'id' => $user->id,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logout successful.',
        ]);
    }
}
