<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserPhoneNumber;
use App\Support\PhoneNumber;
use InvalidArgumentException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PhoneNumberService
{
    public function __construct(
        private readonly PhoneVerificationService $verification,
    ) {}

    public function add(User $user, string $number, bool $makePrimary = false): UserPhoneNumber
    {
        return DB::transaction(function () use ($user, $number, $makePrimary) {
            $number = $this->normalize($number);

            if ($user->phoneNumbers()->where('phone_number', $number)->exists()) {
                throw ValidationException::withMessages([
                    'phone_number' => 'This number is already saved to your account.',
                ]);
            }

            $isPrimary = $makePrimary
                || ! $user->phoneNumbers()->where('is_primary', true)->exists();

            if ($isPrimary) {
                $user->phoneNumbers()->update(['is_primary' => false]);
            }

            $phone = $user->phoneNumbers()->create([
                'phone_number' => $number,
                'is_primary' => $isPrimary,
                'verified_at' => null,
            ]);

            $this->syncLegacyPhone($user);

            return $phone;
        });
    }

    public function update(
        User $user,
        UserPhoneNumber $phone,
        ?string $number = null,
        ?bool $makePrimary = null,
    ): UserPhoneNumber {
        return DB::transaction(function () use ($user, $phone, $number, $makePrimary) {
            if ($number !== null) {
                $number = $this->normalize($number);

                if ($number !== $phone->phone_number) {
                    if ($user->phoneNumbers()
                        ->where('phone_number', $number)
                        ->whereKeyNot($phone->id)
                        ->exists()) {
                        throw ValidationException::withMessages([
                            'phone_number' => 'This number is already saved to your account.',
                        ]);
                    }

                    $this->verification->forget($user, $phone);
                    $phone->phone_number = $number;
                    $phone->verified_at = null;
                }
            }

            if ($makePrimary === true) {
                $user->phoneNumbers()
                    ->whereKeyNot($phone->id)
                    ->update(['is_primary' => false]);

                $phone->is_primary = true;
            }

            $phone->save();
            $this->syncLegacyPhone($user);

            return $phone;
        });
    }

    public function remove(User $user, UserPhoneNumber $phone): void
    {
        DB::transaction(function () use ($user, $phone) {
            $this->verification->forget($user, $phone);

            $wasPrimary = $phone->is_primary;
            $phone->delete();

            if ($wasPrimary) {
                $next = $user->phoneNumbers()->first();

                if ($next) {
                    $next->forceFill(['is_primary' => true])->save();
                }
            }

            $this->syncLegacyPhone($user);
        });
    }

    public function setPrimary(User $user, UserPhoneNumber $phone): void
    {
        DB::transaction(function () use ($user, $phone) {
            $user->phoneNumbers()->update(['is_primary' => false]);
            $phone->forceFill(['is_primary' => true])->save();
            $this->syncLegacyPhone($user);
        });
    }

    /**
     * Keep users.phone_number pointed at the primary record for older code
     * paths and for the booking API fallback.
     */
    public function syncLegacyPhone(User $user): void
    {
        $primary = $user->phoneNumbers()->where('is_primary', true)->first()
            ?? $user->phoneNumbers()->first();

        if ($primary && ! $primary->is_primary) {
            $primary->forceFill(['is_primary' => true])->save();
        }

        $user->forceFill(['phone_number' => $primary?->phone_number])->save();
    }

    /**
     * Support the legacy profile endpoint that still accepts one phone number.
     */
    public function replacePrimary(User $user, ?string $number): void
    {
        $number = $number !== null ? trim($number) : '';

        if ($number === '') {
            return;
        }

        $number = $this->normalize($number);

        DB::transaction(function () use ($user, $number) {
            $existing = $user->phoneNumbers()
                ->where('phone_number', $number)
                ->first();

            if ($existing) {
                $this->setPrimary($user, $existing);

                return;
            }

            $current = $user->phoneNumbers()
                ->where('is_primary', true)
                ->first();

            if ($current) {
                $this->verification->forget($user, $current);
                $current->forceFill([
                    'phone_number' => $number,
                    'verified_at' => null,
                ])->save();

                $this->syncLegacyPhone($user);

                return;
            }

            $this->add($user, $number, true);
        });
    }

    private function normalize(string $number): string
    {
        try {
            $normalized = PhoneNumber::normalize($number);
        } catch (InvalidArgumentException) {
            $normalized = null;
        }

        if ($normalized === null) {
            throw ValidationException::withMessages([
                'phone_number' => 'Enter a valid phone number (e.g. 0917 123 4567 or +63 917 123 4567).',
            ]);
        }

        return $normalized;
    }
}