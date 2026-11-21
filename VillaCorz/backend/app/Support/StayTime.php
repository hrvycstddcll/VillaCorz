<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use DateTimeInterface;
use InvalidArgumentException;

class StayTime
{
    public const TIMEZONE = 'Asia/Manila';

    private const ISO_PATTERN = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/';

    private const DATE_PATTERN = '/^\d{4}-\d{2}-\d{2}$/';

    private const SQL_DATETIME_PATTERN = '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/';

    public static function isValidApiValue(mixed $value): bool
    {
        if (! is_string($value)) {
            return false;
        }

        if (preg_match(self::ISO_PATTERN, $value) === 1) {
            return true;
        }

        if (preg_match(self::DATE_PATTERN, $value) !== 1) {
            return false;
        }

        try {
            CarbonImmutable::createFromFormat('!Y-m-d', $value, self::TIMEZONE);
        } catch (InvalidArgumentException) {
            return false;
        }

        return CarbonImmutable::createFromFormat('!Y-m-d', $value, self::TIMEZONE)?->format('Y-m-d') === $value;
    }

    public static function parseApi(mixed $value): CarbonImmutable
    {
        if (! is_string($value)) {
            throw new InvalidArgumentException('Invalid stay time.');
        }

        if (preg_match(self::ISO_PATTERN, $value) === 1) {
            return CarbonImmutable::parse($value)->utc();
        }

        if (preg_match(self::DATE_PATTERN, $value) === 1) {
            return CarbonImmutable::createFromFormat('!Y-m-d H:i', $value.' 08:00', self::TIMEZONE)->utc();
        }

        if (preg_match(self::SQL_DATETIME_PATTERN, $value) === 1) {
            $parsed = CarbonImmutable::createFromFormat('!Y-m-d H:i:s', $value, 'UTC');

            if ($parsed?->format('Y-m-d H:i:s') === $value) {
                return $parsed->utc();
            }
        }

        throw new InvalidArgumentException('Invalid stay time.');
    }

    public static function parseLocal(string $date, string $time): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('!Y-m-d H:i', $date.' '.$time, self::TIMEZONE)->utc();
    }

    public static function toCarbon(mixed $value): CarbonImmutable
    {
        if ($value instanceof CarbonImmutable) {
            return $value->utc();
        }

        if ($value instanceof DateTimeInterface) {
            return CarbonImmutable::instance($value)->utc();
        }

        return self::parseApi($value);
    }

    public static function localDate(mixed $value): string
    {
        return self::toCarbon($value)->setTimezone(self::TIMEZONE)->toDateString();
    }

    public static function formatPht(mixed $value, string $format = 'D, M j, Y g:i A'): string
    {
        return self::toCarbon($value)->setTimezone(self::TIMEZONE)->format($format);
    }
}
