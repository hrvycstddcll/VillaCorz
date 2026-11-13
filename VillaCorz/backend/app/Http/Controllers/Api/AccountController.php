<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetCode;
use App\Models\User;
use App\Rules\PhoneNumberRule;
use App\Services\ActivityLogger;
use App\Services\PhoneNumberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class AccountController extends Controller
{
    private const RESET_TTL_MINUTES = 10;

    private const MAX_RESET_ATTEMPTS = 5;

    public function updateProfile(
        Request $request,
        PhoneNumberService $phones,
    ): JsonResponse {
        $validated = $request->validate([
            'firstname' => ['required', 'string', 'max:255'],
            'lastname' => ['required', 'string', 'max:255'],
            'phone_number' => ['sometimes', 'nullable', 'string', 'max:32', new PhoneNumberRule()],
            'current_password' => ['required', 'string'],
        ]);

        $user = $request->user();
        $this->ensureCurrentPassword($user, $validated['current_password']);

        $user->fill([
            'firstname' => $validated['firstname'],
            'lastname' => $validated['lastname'],
        ])->save();

        // Older clients still send one phone number. Sync it into the new
        // multi-number table instead of writing the legacy column directly.
        if ($request->has('phone_number')) {
            $phones->replacePrimary($user, $validated['phone_number'] ?? null);
        }

        ActivityLogger::record(
            'account_profile_updated',
            $user,
            'Updated account profile details.',
            User::class,
            $user->id,
            ['fields' => ['firstname', 'lastname', 'phone_number']],
            $request,
        );

        return response()->json([
            'message' => 'Account details updated.',
            'user' => $this->userPayload($user),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'different:current_password'],
        ]);

        $user = $request->user();
        $this->ensureCurrentPassword($user, $validated['current_password']);

        $user->forceFill([
            'password' => $validated['password'],
            'remember_token' => Str::random(60),
        ])->save();

        ActivityLogger::record(
            'account_password_changed',
            $user,
            'Changed account password.',
            User::class,
            $user->id,
            [],
            $request,
        );

        return response()->json(['message' => 'Password changed successfully.']);
    }

    public function sendPasswordResetCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = Str::lower(trim($validated['email']));
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();
        $resetId = (string) Str::uuid();
        $code = (string) random_int(100000, 999999);
        $cacheKey = $this->resetCacheKey($resetId);
        $attemptsKey = $this->resetAttemptsKey($resetId);

        Cache::put($cacheKey, [
            'user_id' => $user?->id,
            'code_hash' => Hash::make($code),
        ], now()->addMinutes(self::RESET_TTL_MINUTES));
        Cache::put($attemptsKey, 0, now()->addMinutes(self::RESET_TTL_MINUTES));

        if ($user) {
            try {
                Mail::to($user->email)->send(new PasswordResetCode(
                    $user->firstname,
                    $code,
                ));
            } catch (Throwable $exception) {
                $this->forgetReset($cacheKey, $attemptsKey);
                throw $exception;
            }
        }

        $localDevelopmentMailer = app()->environment('local')
            && config('mail.default') === 'log';
        $exposeDevelopmentCode = $user
            && $localDevelopmentMailer
            && config('services.verification.expose_development_code', false);

        return response()->json(array_filter([
            'message' => 'If an account exists for that email, a password reset code has been sent.',
            'reset_id' => $resetId,
            'expires_in' => self::RESET_TTL_MINUTES * 60,
            'verification_delivery' => $localDevelopmentMailer ? 'log' : 'email',
            'development_code' => $exposeDevelopmentCode ? $code : null,
        ], fn ($value) => $value !== null), 202);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reset_id' => ['required', 'uuid'],
            'code' => ['required', 'string', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $resetId = $validated['reset_id'];
        $cacheKey = $this->resetCacheKey($resetId);
        $attemptsKey = $this->resetAttemptsKey($resetId);
        $reset = Cache::get($cacheKey);

        if (! $reset) {
            throw ValidationException::withMessages([
                'code' => 'This code is invalid or has expired. Request a new code and try again.',
            ]);
        }

        $attempts = (int) Cache::get($attemptsKey, 0);

        if ($attempts >= self::MAX_RESET_ATTEMPTS) {
            $this->forgetReset($cacheKey, $attemptsKey);

            return response()->json([
                'message' => 'Too many incorrect codes. Request a new code to try again.',
            ], 429);
        }

        $user = $reset['user_id']
            ? User::find($reset['user_id'])
            : null;

        if (! Hash::check($validated['code'], $reset['code_hash']) || ! $user) {
            $attempts = Cache::increment($attemptsKey);

            if ($attempts >= self::MAX_RESET_ATTEMPTS) {
                $this->forgetReset($cacheKey, $attemptsKey);

                return response()->json([
                    'message' => 'Too many incorrect codes. Request a new code to try again.',
                ], 429);
            }

            throw ValidationException::withMessages([
                'code' => 'This code is invalid or has expired. Request a new code and try again.',
            ]);
        }

        DB::transaction(function () use ($user, $validated) {
            $user->forceFill([
                'password' => $validated['password'],
                'remember_token' => Str::random(60),
            ])->save();
        });

        $this->forgetReset($cacheKey, $attemptsKey);

        ActivityLogger::record(
            'account_password_reset',
            $user,
            'Reset account password using an email verification code.',
            User::class,
            $user->id,
            [],
            $request,
        );

        return response()->json([
            'message' => 'Password reset successfully. You can now sign in with your new password.',
        ]);
    }

    private function ensureCurrentPassword(User $user, string $password): void
    {
        if (! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'Your current password is incorrect.',
            ]);
        }
    }

    private function userPayload(User $user): array
    {
        return $user->accountPayload();
    }

    private function resetCacheKey(string $resetId): string
    {
        return "password_reset:{$resetId}";
    }

    private function resetAttemptsKey(string $resetId): string
    {
        return "password_reset_attempts:{$resetId}";
    }

    private function forgetReset(string $cacheKey, string $attemptsKey): void
    {
        Cache::forget($cacheKey);
        Cache::forget($attemptsKey);
    }
}
