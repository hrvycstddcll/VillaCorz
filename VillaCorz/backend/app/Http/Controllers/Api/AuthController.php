<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Database\QueryException;
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
            'email' => 'required|email|max:255',
            'password' => 'required|string|min:8',
        ]);

        $email = $this->normalizeEmail($validated['email']);

        if (User::whereRaw('LOWER(email) = ?', [$email])->exists()) {
            throw ValidationException::withMessages([
                'email' => 'An account with this email already exists. Please log in.',
            ]);
        }

        $emailIndexKey = $this->pendingEmailCacheKey($email);
        $existingRegistrationId = Cache::get($emailIndexKey);

        if (is_string($existingRegistrationId) && Cache::has("pending_registration:{$existingRegistrationId}")) {
            $registrationId = $existingRegistrationId;
            $cacheKey = "pending_registration:{$existingRegistrationId}";
            $attemptsKey = "pending_registration_attempts:{$existingRegistrationId}";
            $pending = Cache::get($cacheKey, []);

            $otp = (string) random_int(100000, 999999);
            $pending['firstname'] = $validated['firstname'];
            $pending['lastname'] = $validated['lastname'];
            $pending['email'] = $email;
            $pending['password'] = Hash::make($validated['password']);
            $pending['otp_hash'] = Hash::make($otp);

            Cache::put($cacheKey, $pending, now()->addMinutes(10));
            Cache::put($attemptsKey, 0, now()->addMinutes(10));
        } else {
            if (is_string($existingRegistrationId)) {
                Cache::forget($emailIndexKey);
            }

            $registrationId = (string) Str::uuid();
            $otp = (string) random_int(100000, 999999);
            $cacheKey = "pending_registration:{$registrationId}";
            $attemptsKey = "pending_registration_attempts:{$registrationId}";

            if (! Cache::add($emailIndexKey, $registrationId, now()->addMinutes(10))) {
                $existingRegistrationId = Cache::get($emailIndexKey);

                if (is_string($existingRegistrationId) && Cache::has("pending_registration:{$existingRegistrationId}")) {
                    $registrationId = $existingRegistrationId;
                    $cacheKey = "pending_registration:{$existingRegistrationId}";
                    $attemptsKey = "pending_registration_attempts:{$existingRegistrationId}";
                    $pending = Cache::get($cacheKey, []);
                    $otp = (string) random_int(100000, 999999);
                    $pending['firstname'] = $validated['firstname'];
                    $pending['lastname'] = $validated['lastname'];
                    $pending['email'] = $email;
                    $pending['password'] = Hash::make($validated['password']);
                    $pending['otp_hash'] = Hash::make($otp);

                    Cache::put($cacheKey, $pending, now()->addMinutes(10));
                    Cache::put($attemptsKey, 0, now()->addMinutes(10));
                } else {
                    return response()->json([
                        'message' => 'Unable to start registration. Please try again.',
                    ], 500);
                }
            }

            Cache::put($cacheKey, [
                'firstname' => $validated['firstname'],
                'lastname' => $validated['lastname'],
                'email' => $email,
                'password' => Hash::make($validated['password']),
                'otp_hash' => Hash::make($otp),
            ], now()->addMinutes(10));

            Cache::put($attemptsKey, 0, now()->addMinutes(10));
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

            Cache::forget($cacheKey);
            Cache::forget($attemptsKey);
            Cache::forget($emailIndexKey);

            return response()->json([
                'message' => 'Unable to send the verification email. Please try again.',
            ], 500);
        }

        $localDevelopmentMailer = app()->environment('local')
            && config('mail.default') === 'log';
        $exposeDevelopmentCode = $localDevelopmentMailer
            && config('services.verification.expose_development_code', false);

        return response()->json(array_filter([
            'message' => $exposeDevelopmentCode
                ? 'A verification code is ready for local development.'
                : ($localDevelopmentMailer
                    ? 'A verification code has been written to the application log.'
                    : 'A verification code has been sent to your email.'),
            'verification_delivery' => $localDevelopmentMailer ? 'log' : 'email',
            'development_code' => $exposeDevelopmentCode ? $otp : null,
            'registration_id' => $registrationId,
            'expires_in' => 600,
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

        $cacheKey = "pending_registration:{$registrationId}";
        $attemptsKey = "pending_registration_attempts:{$registrationId}";

        $pending = Cache::get($cacheKey);

        if (! $pending) {
            return response()->json([
                'message' => 'This registration has expired. Please register again.',
            ], 422);
        }

        $pendingEmail = $this->normalizeEmail((string) ($pending['email'] ?? ''));

        $attempts = (int) Cache::get($attemptsKey, 0);

        if ($attempts >= 5) {
            $this->forgetPendingRegistration($registrationId, $pendingEmail);

            return response()->json([
                'message' => 'Too many incorrect attempts. Please register again.',
            ], 429);
        }

        if (! Hash::check($validated['otp'], $pending['otp_hash'])) {
            $attempts = Cache::increment($attemptsKey);

            if ($attempts >= 5) {
                $this->forgetPendingRegistration($registrationId, $pendingEmail);

                return response()->json([
                    'message' => 'Too many incorrect attempts. Please register again.',
                ], 429);
            }

            return response()->json([
                'message' => 'Invalid verification code.',
                'attempts_remaining' => 5 - $attempts,
            ], 422);
        }

        if (User::whereRaw('LOWER(email) = ?', [$pendingEmail])->exists()) {
            $this->forgetPendingRegistration($registrationId, $pendingEmail);

            return response()->json([
                'message' => 'An account with this email already exists. Please log in.',
            ], 409);
        }

        $duplicateDuringWrite = false;

        try {
            $user = DB::transaction(function () use ($pending, $pendingEmail, &$duplicateDuringWrite) {
                if (User::whereRaw('LOWER(email) = ?', [$pendingEmail])->exists()) {
                    $duplicateDuringWrite = true;

                    return null;
                }

                $user = User::create([
                    'firstname' => $pending['firstname'],
                    'lastname' => $pending['lastname'],
                    'email' => $pendingEmail,
                    'password' => $pending['password'],
                    'role' => 'customer',
                ]);

                $user->forceFill([
                    'email_verified_at' => now(),
                ])->save();

                return $user;
            });
        } catch (QueryException $exception) {
            $message = strtolower($exception->getMessage());

            if (str_contains($message, 'duplicate key') || str_contains($message, 'unique constraint')) {
                $this->forgetPendingRegistration($registrationId, $pendingEmail);

                return response()->json([
                    'message' => 'An account with this email already exists. Please log in.',
                ], 409);
            }

            throw $exception;
        }

        $this->forgetPendingRegistration($registrationId, $pendingEmail);

        if (! $user) {
            return response()->json([
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

        return response()->json([
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

        $cacheKey = "pending_registration:{$registrationId}";
        $attemptsKey = "pending_registration_attempts:{$registrationId}";

        $pending = Cache::get($cacheKey);

        if (! $pending) {
            return response()->json([
                'message' => 'This registration has expired. Please register again.',
            ], 422);
        }

        $pendingEmail = $this->normalizeEmail((string) ($pending['email'] ?? ''));

        if (User::whereRaw('LOWER(email) = ?', [$pendingEmail])->exists()) {
            $this->forgetPendingRegistration($registrationId, $pendingEmail);

            return response()->json([
                'message' => 'An account with this email already exists. Please log in.',
            ], 409);
        }

        $otp = (string) random_int(100000, 999999);

        $pending['email'] = $pendingEmail;
        $pending['otp_hash'] = Hash::make($otp);

        Cache::put($cacheKey, $pending, now()->addMinutes(10));
        Cache::put($attemptsKey, 0, now()->addMinutes(10));

        try {
            Mail::send('emails.verify-otp', [
                'otp' => $otp,
                'firstname' => $pending['firstname'],
            ], function ($message) use ($pending) {
                $message->to($pending['email'])
                    ->subject('VillaCorz Email Verification');
            });
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Unable to send the verification email. Please try again.',
            ], 500);
        }

        $localDevelopmentMailer = app()->environment('local')
            && config('mail.default') === 'log';
        $exposeDevelopmentCode = $localDevelopmentMailer
            && config('services.verification.expose_development_code', false);

        return response()->json(array_filter([
            'message' => $exposeDevelopmentCode
                ? 'A new verification code is ready for local development.'
                : ($localDevelopmentMailer
                    ? 'A new verification code has been written to the application log.'
                    : 'A new verification code has been sent to your email.'),
            'verification_delivery' => $localDevelopmentMailer ? 'log' : 'email',
            'development_code' => $exposeDevelopmentCode ? $otp : null,
            'registration_id' => $registrationId,
            'expires_in' => 600,
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

    private function pendingEmailCacheKey(string $email): string
    {
        return 'pending_registration_email:'.sha1($email);
    }

    private function forgetPendingRegistration(string $registrationId, string $email): void
    {
        Cache::forget("pending_registration:{$registrationId}");
        Cache::forget("pending_registration_attempts:{$registrationId}");

        if ($email !== '' && Cache::get($this->pendingEmailCacheKey($email)) === $registrationId) {
            Cache::forget($this->pendingEmailCacheKey($email));
        }
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
