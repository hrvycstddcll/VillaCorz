<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserPhoneNumber;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class PhoneVerificationService
{
    private const TTL_MINUTES = 10;

    private const MAX_ATTEMPTS = 5;

    /**
     * Email a six-digit code to the account owner. Email keeps the demo free
     * and independent of SMS credits while still proving account control.
     *
     * @return array{message: string, verification_delivery: string, expires_in: int, development_code?: string}
     */
    public function send(User $user, UserPhoneNumber $phone): array
    {
        $otp = (string) random_int(100000, 999999);

        Cache::put($this->cacheKey($user, $phone), [
            'otp_hash' => Hash::make($otp),
            'phone_number' => $phone->phone_number,
        ], now()->addMinutes(self::TTL_MINUTES));

        Cache::put($this->attemptsKey($user, $phone), 0, now()->addMinutes(self::TTL_MINUTES));

        try {
            Mail::send('emails.verify-phone-otp', [
                'otp' => $otp,
                'firstname' => $user->firstname,
                'phoneNumber' => $phone->phone_number,
            ], function ($message) use ($user) {
                $message->to($user->email)
                    ->subject('Verify your VillaCorz phone number');
            });
        } catch (Throwable $exception) {
            report($exception);

            $this->forget($user, $phone);

            throw ValidationException::withMessages([
                'phone_number' => 'Unable to send the verification email. Please try again.',
            ]);
        }

        $localDevelopmentMailer = app()->environment('local')
            && config('mail.default') === 'log';
        $exposeDevelopmentCode = $localDevelopmentMailer
            && config('services.verification.expose_development_code', false);

        return array_filter([
            'message' => $exposeDevelopmentCode
                ? 'A verification code is ready for local development.'
                : ($localDevelopmentMailer
                    ? 'A verification code has been written to the application log.'
                    : 'A verification code has been sent to your email.'),
            'verification_delivery' => $localDevelopmentMailer ? 'log' : 'email',
            'development_code' => $exposeDevelopmentCode ? $otp : null,
            'expires_in' => self::TTL_MINUTES * 60,
        ], fn ($value) => $value !== null);
    }

    /**
     * @throws ValidationException
     */
    public function confirm(User $user, UserPhoneNumber $phone, string $otp): void
    {
        $cacheKey = $this->cacheKey($user, $phone);
        $attemptsKey = $this->attemptsKey($user, $phone);
        $pending = Cache::get($cacheKey);

        if (! is_array($pending)) {
            throw ValidationException::withMessages([
                'otp' => 'This verification code has expired. Please request a new one.',
            ]);
        }

        if (($pending['phone_number'] ?? null) !== $phone->phone_number) {
            $this->forget($user, $phone);

            throw ValidationException::withMessages([
                'otp' => 'This number changed. Please request a new verification code.',
            ]);
        }

        $attempts = (int) Cache::get($attemptsKey, 0);

        if ($attempts >= self::MAX_ATTEMPTS) {
            $this->forget($user, $phone);

            throw ValidationException::withMessages([
                'otp' => 'Too many incorrect attempts. Please request a new code.',
            ]);
        }

        if (! Hash::check($otp, $pending['otp_hash'] ?? '')) {
            $attempts = (int) Cache::increment($attemptsKey);
            $remaining = max(0, self::MAX_ATTEMPTS - $attempts);

            if ($attempts >= self::MAX_ATTEMPTS) {
                $this->forget($user, $phone);

                throw ValidationException::withMessages([
                    'otp' => 'Too many incorrect attempts. Please request a new code.',
                ]);
            }

            throw ValidationException::withMessages([
                'otp' => "Invalid verification code. {$remaining} attempt".($remaining === 1 ? '' : 's').' remaining.',
            ]);
        }

        $phone->forceFill(['verified_at' => now()])->save();

        $this->forget($user, $phone);
    }

    public function forget(User $user, UserPhoneNumber $phone): void
    {
        Cache::forget($this->cacheKey($user, $phone));
        Cache::forget($this->attemptsKey($user, $phone));
    }

    private function cacheKey(User $user, UserPhoneNumber $phone): string
    {
        return "phone_verification:{$user->id}:{$phone->id}";
    }

    private function attemptsKey(User $user, UserPhoneNumber $phone): string
    {
        return "phone_verification_attempts:{$user->id}:{$phone->id}";
    }
}