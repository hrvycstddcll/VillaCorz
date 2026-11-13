<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * One canonical phone format keeps accounts, bookings, verification, and
 * idempotency hashes consistent no matter how a guest types their number.
 *
 * Local numbers are assumed to be Philippine mobiles and converted to
 * E.164 (+639XXXXXXXXX). Explicit international numbers stay in E.164.
 */
final class PhoneNumber
{
    public const DEFAULT_COUNTRY_CODE = '63';

    /**
     * @throws InvalidArgumentException
     */
    public static function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);

        if ($trimmed === '') {
            return null;
        }

        $international = str_starts_with($trimmed, '+');

        if (str_starts_with($trimmed, '00')) {
            $trimmed = '+'.substr($trimmed, 2);
            $international = true;
        }

        $digits = preg_replace('/\D+/', '', $trimmed) ?? '';

        if ($digits === '') {
            throw new InvalidArgumentException('Enter a valid phone number.');
        }

        if ($international) {
            $e164 = '+'.$digits;
        } elseif (
            str_starts_with($digits, self::DEFAULT_COUNTRY_CODE)
            && strlen($digits) === 12
        ) {
            $e164 = '+'.$digits;
        } elseif (str_starts_with($digits, '0')) {
            $e164 = '+'.self::DEFAULT_COUNTRY_CODE.substr($digits, 1);
        } else {
            $e164 = '+'.self::DEFAULT_COUNTRY_CODE.$digits;
        }

        if (str_starts_with($e164, '+'.self::DEFAULT_COUNTRY_CODE)) {
            if (! preg_match('/^\+639\d{9}$/', $e164)) {
                throw new InvalidArgumentException(
                    'Enter a valid PH mobile number (e.g. 0917 123 4567 or +63 917 123 4567).',
                );
            }

            return $e164;
        }

        if (! preg_match('/^\+[1-9]\d{7,14}$/', $e164)) {
            throw new InvalidArgumentException(
                'Enter a valid international phone number (e.g. +1 415 555 0132).',
            );
        }

        return $e164;
    }

    public static function tryNormalize(?string $value): ?string
    {
        try {
            return self::normalize($value);
        } catch (InvalidArgumentException) {
            return null;
        }
    }

    /**
     * Human-friendly form for screens and emails. Storage stays in E.164.
     */
    public static function format(?string $value): ?string
    {
        $normalized = self::tryNormalize($value);

        if ($normalized === null) {
            return $value;
        }

        if (str_starts_with($normalized, '+'.self::DEFAULT_COUNTRY_CODE)) {
            $national = substr($normalized, 3);

            return sprintf(
                '+63 %s %s %s',
                substr($national, 0, 3),
                substr($national, 3, 3),
                substr($national, 6, 4),
            );
        }

        return $normalized;
    }
}