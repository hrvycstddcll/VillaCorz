<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PendingRegistration;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
            'email' => 'required|email|max:255',
            'password' => 'required|string|min:8',
        ]);

        $email = $this->normalizeEmail($validated['email']);

        if (User::whereRaw('LOWER(email) = ?', [$email])->exists()) {
            throw ValidationException::withMessages([
                'email' => 'An account with this email already exists. Please log in.',
            ]);
        }

        $otp = (string) random_int(100000, 999999);
        $expiresAt = now()->addMinutes(10);
        $attributes = [
            'email' => $email,
            'firstname' => $validated['firstname'],
            'lastname' => $validated['lastname'],
            'password' => Hash::make($validated['password']),
            'otp_hash' => Hash::make($otp),
            'attempts' => 0,
            'expires_at' => $expiresAt,
            'last_sent_at' => now(),
        ];

        $pending = PendingRegistration::where('email', $email)->first();
        $registrationId = $pending?->id;

        if ($pending) {
            $pending->fill($attributes)->save();
        } else {
            $registrationId = (string) Str::uuid();

            try {
                $pending = PendingRegistration::create(array_merge([
                    'id' => $registrationId,
                ], $attributes));
            } catch (QueryException $exception) {
                $pending = PendingRegistration::where('email', $email)->first();

                if (! $pending) {
                    throw $exception;
                }

                $registrationId = $pending->id;
                $pending->fill($attributes)->save();
            }
        }

        try {
            Mail::send('emails.verify-otp', [
                'otp' => $otp,
                'firstname' => $validated['firstname'],
            ], function ($message) use ($email) {
                $message->to($email)
                    ->subject('VillaCorz Email Verification');
            });
        } catch (Throwable $exception) {
            report($exception);

            $pending->delete();

            return response()->json([
                'code' => 'mail_send_failed',
                'message' => 'Unable to send the verification email. Please try again.',
            ], 500);
        }

        $localDevelopmentMailer = app()->environment('local')
            && config('mail.default') === 'log';
        $exposeDevelopmentCode = $localDevelopmentMailer
            && config('services.verification.expose_development_code', false);

        return response()->json(array_filter([
            'code' => 'verification_code_sent',
            'message' => $exposeDevelopmentCode
                ? 'A verification code is ready for local development.'
                : ($localDevelopmentMailer
                    ? 'A verification code has been written to the application log.'
                    : 'A verification code has been sent to your email.'),
            'verification_delivery' => $localDevelopmentMailer ? 'log' : 'email',
            'development_code' => $exposeDevelopmentCode ? $otp : null,
            'registration_id' => $registrationId,
            'expires_in' => 600,
            'expires_at' => $expiresAt->toIso8601String(),
        ], fn ($value) => $value !== null), 200);
    }

    public function verifyOtp(Request $request)
    {
        $validated = $request->validate([
            'registration_id' => 'required|uuid',
            'otp' => 'required|string|digits:6',
            'remember' => 'sometimes|boolean',
        ]);

        $registrationId = $validated['registration_id'];
        $pending = PendingRegistration::find($registrationId);

        if (! $pending || $pending->expires_at->isPast()) {
            $pending?->delete();

            return response()->json([
                'code' => 'registration_expired',
                'message' => 'This registration has expired. Please register again.',
            ], 422);
        }

        if ($pending->attempts >= 5) {
            $pending->delete();

            return response()->json([
                'code' => 'too_many_attempts',
                'message' => 'Too many incorrect attempts. Please register again.',
            ], 429);
        }

        if (! Hash::check($validated['otp'], $pending->otp_hash)) {
            $pending->attempts += 1;
            $pending->save();

            if ($pending->attempts >= 5) {
                $pending->delete();

                return response()->json([
                    'code' => 'too_many_attempts',
                    'message' => 'Too many incorrect attempts. Please register again.',
                ], 429);
            }

            return response()->json([
                'code' => 'invalid_otp',
                'message' => 'Invalid verification code.',
                'attempts_remaining' => 5 - $pending->attempts,
            ], 422);
        }

        $pendingEmail = $this->normalizeEmail((string) $pending->email);

        if (User::whereRaw('LOWER(email) = ?', [$pendingEmail])->exists()) {
            $pending->delete();

            return response()->json([
                'code' => 'duplicate_account',
                'message' => 'An account with this email already exists. Please log in.',
            ], 409);
        }

        try {
            DB::transaction(function () use ($pending, $pendingEmail, &$user) {
                if (User::whereRaw('LOWER(email) = ?', [$pendingEmail])->exists()) {
                    $user = null;

                    return;
                }

                $user = User::create([
                    'firstname' => $pending->firstname,
                    'lastname' => $pending->lastname,
                    'email' => $pendingEmail,
                    'password' => $pending->password,
                    'role' => 'customer',
                ]);

                $user->forceFill([
                    'email_verified_at' => now(),
                ])->save();
            });
        } catch (QueryException $exception) {
            $message = strtolower($exception->getMessage());

            if (str_contains($message, 'duplicate key') || str_contains($message, 'unique constraint')) {
                $pending->delete();

                return response()->json([
                    'code' => 'duplicate_account',
                    'message' => 'An account with this email already exists. Please log in.',
                ], 409);
            }

            throw $exception;
        }

        if (! $user) {
            $pending->delete();

            return response()->json([
                'code' => 'duplicate_account',
                'message' => 'An account with this email already exists. Please log in.',
            ], 409);
        }

        if ($request->hasSession()) {
            Auth::login($user);
            $request->session()->regenerate();
        }

        ActivityLogger::record(
            'registered',
            $user,
            'Account created after email verification.',
            User::class,
            $user->id,
            ['role' => $user->role],
            $request,
        );

        $token = $this->issueSpaToken($user, $request->boolean('remember'));
        $pending->delete();

        return response()->json([
            'code' => 'email_verified',
            'message' => 'Email verified and account created successfully.',
            'user' => $user->accountPayload(),
            'token' => $token['token'],
            'token_type' => $token['token_type'],
            'expires_at' => $token['expires_at'],
        ], 201);
    }

    public function resendOtp(Request $request)
    {
        $validated = $request->validate([
            'registration_id' => 'required|uuid',
        ]);

        $registrationId = $validated['registration_id'];
        $pending = PendingRegistration::find($registrationId);

        if (! $pending || $pending->expires_at->isPast()) {
            $pending?->delete();

            return response()->json([
                'code' => 'registration_expired',
                'message' => 'This registration has expired. Please register again.',
            ], 422);
        }

        $pendingEmail = $this->normalizeEmail((string) $pending->email);

        if (User::whereRaw('LOWER(email) = ?', [$pendingEmail])->exists()) {
            $pending->delete();

            return response()->json([
                'code' => 'duplicate_account',
                'message' => 'An account with this email already exists. Please log in.',
            ], 409);
        }

        $otp = (string) random_int(100000, 999999);
        $expiresAt = now()->addMinutes(10);

        try {
            Mail::send('emails.verify-otp', [
                'otp' => $otp,
                'firstname' => $pending->firstname,
            ], function ($message) use ($pendingEmail) {
                $message->to($pendingEmail)
                    ->subject('VillaCorz Email Verification');
            });
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'code' => 'mail_send_failed',
                'message' => 'Unable to send the verification email. Please try again.',
            ], 500);
        }

        $pending->fill([
            'email' => $pendingEmail,
            'otp_hash' => Hash::make($otp),
            'attempts' => 0,
            'expires_at' => $expiresAt,
            'last_sent_at' => now(),
        ])->save();

        $localDevelopmentMailer = app()->environment('local')
            && config('mail.default') === 'log';
        $exposeDevelopmentCode = $localDevelopmentMailer
            && config('services.verification.expose_development_code', false);

        return response()->json(array_filter([
            'code' => 'verification_code_resent',
            'message' => $exposeDevelopmentCode
                ? 'A new verification code is ready for local development.'
                : ($localDevelopmentMailer
                    ? 'A new verification code has been written to the local application log.'
                    : 'A new verification code has been sent to your email.'),
            'verification_delivery' => $localDevelopmentMailer ? 'log' : 'email',
            'development_code' => $exposeDevelopmentCode ? $otp : null,
            'registration_id' => $registrationId,
            'expires_in' => 600,
            'expires_at' => $expiresAt->toIso8601String(),
        ], fn ($value) => $value !== null), 200);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8',
            'remember' => 'sometimes|boolean',
        ]);

        $credentials = [
            'email' => $this->normalizeEmail($credentials['email']),
            'password' => $credentials['password'],
        ];

        $pending = PendingRegistration::where('email', $credentials['email'])->first();

        if ($pending && $pending->expires_at->isPast()) {
            $pending->delete();
            $pending = null;
        }

        if ($pending) {
            return response()->json([
                'code' => 'verification_pending',
                'message' => 'Please verify your email before logging in.',
                'registration_id' => $pending->id,
                'expires_at' => $pending->expires_at->toIso8601String(),
            ], 422);
        }

        if (! Auth::attempt($credentials)) {
            $normalizedEmail = $credentials['email'];
            $user = User::query()
                ->whereRaw('LOWER(email) = ?', [$normalizedEmail])
                ->get()
                ->first(fn (User $candidate) => Hash::check(
                    $credentials['password'],
                    $candidate->password,
                ));

            if ($user) {
                Auth::login($user);
            } else {
                ActivityLogger::record(
                    'login_failed',
                    null,
                    "Failed sign-in attempt for {$credentials['email']}.",
                    User::class,
                    null,
                    ['email' => $credentials['email']],
                    $request,
                );

                throw ValidationException::withMessages([
                    'email' => 'Invalid email or password.',
                ]);
            }
        }

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        $user = Auth::user();

        ActivityLogger::record(
            'login',
            $user,
            'Signed in.',
            User::class,
            $user->id,
            ['role' => $user->role],
            $request,
        );

        $token = $this->issueSpaToken($user, $request->boolean('remember'));

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user->accountPayload(),
            'token' => $token['token'],
            'token_type' => $token['token_type'],
            'expires_at' => $token['expires_at'],
        ]);
    }

    private function issueSpaToken(User $user, bool $remember): array
    {
        $expiresAt = now()->addDays($remember ? 30 : 1);
        $token = $user->createToken('villacorz-spa', ['*'], $expiresAt)->plainTextToken;

        return [
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    private function normalizeEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            ActivityLogger::record(
                'logout',
                $user,
                'Signed out.',
                User::class,
                $user->id,
                [],
                $request,
            );
        }

        $currentToken = $user?->currentAccessToken();

        if ($currentToken && method_exists($currentToken, 'delete')) {
            $currentToken->delete();
        } else {
            $bearerToken = $request->bearerToken();
            $tokenId = $bearerToken
                ? explode('|', $bearerToken, 2)[0]
                : null;

            if ($tokenId !== null) {
                $user?->tokens()->where('id', $tokenId)->delete();
            }
        }

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        Auth::forgetGuards();

        return response()->json([
            'message' => 'Logout successful.',
        ]);
    }
}
