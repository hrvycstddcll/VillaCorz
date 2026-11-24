<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use DateTimeInterface;

class StayPolicy
{
    public const DEFAULT_CHECK_IN_TIME = '10:00';

    public const OCCUPANCY_HOURS = 22;

    public const TURNOVER_HOURS = 2;

    public const PAID_DAY_HOURS = 24;

    public static function defaultCheckInTime(): string
    {
        return (string) config('stays.default_check_in_time', self::DEFAULT_CHECK_IN_TIME);
    }

    public static function occupancyHours(): int
    {
        return max(1, (int) config('stays.occupancy_hours', self::OCCUPANCY_HOURS));
    }

    public static function turnoverHours(): int
    {
        return max(0, (int) config('stays.turnover_hours', self::TURNOVER_HOURS));
    }

    public static function turnoverCutoffFor(DateTimeInterface|string $at): CarbonImmutable
    {
        return StayTime::toCarbon($at)->utc()->subHours(self::turnoverHours());
    }

    public static function maxPaidDays(): int
    {
        return max(1, (int) config('stays.max_paid_days', 90));
    }

    public static function checkOutFor(
        DateTimeInterface|string $checkIn,
        int $paidDays,
    ): CarbonImmutable {
        $paidDays = max(1, min($paidDays, self::maxPaidDays()));
        $localCheckIn = StayTime::toCarbon($checkIn)->setTimezone(StayTime::TIMEZONE);

        return $localCheckIn
            ->addDays($paidDays)
            ->subHours(self::turnoverHours())
            ->utc();
    }

    public static function blockingEndFor(
        DateTimeInterface|string $checkIn,
        int $paidDays,
    ): CarbonImmutable {
        $paidDays = max(1, min($paidDays, self::maxPaidDays()));
        $localCheckIn = StayTime::toCarbon($checkIn)->setTimezone(StayTime::TIMEZONE);

        return $localCheckIn->addDays($paidDays)->utc();
    }

    public static function paidDaysFor(
        DateTimeInterface|string $checkIn,
        DateTimeInterface|string $checkOut,
    ): int {
        $start = StayTime::toCarbon($checkIn)->utc()->getTimestamp();
        $end = StayTime::toCarbon($checkOut)->utc()->getTimestamp();
        $elapsedWithTurnover = ($end - $start) + (self::turnoverHours() * 3600);
        $paidDaySeconds = self::PAID_DAY_HOURS * 3600;

        $paidDays = (int) round($elapsedWithTurnover / $paidDaySeconds);

        return max(1, min($paidDays, self::maxPaidDays()));
    }

    public static function isValidStay(
        DateTimeInterface|string $checkIn,
        DateTimeInterface|string $checkOut,
        int $paidDays,
    ): bool {
        if ($paidDays < 1 || $paidDays > self::maxPaidDays()) {
            return false;
        }

        $expected = self::checkOutFor($checkIn, $paidDays);
        $actual = StayTime::toCarbon($checkOut)->utc();

        return abs($expected->getTimestamp() - $actual->getTimestamp()) <= 60;
    }

    /**
     * @return array<int, array{date: string, check_in: string, check_out: string, is_weekend: bool}>
     */
    public static function windows(
        DateTimeInterface|string $checkIn,
        int $paidDays,
    ): array {
        $paidDays = max(1, min($paidDays, self::maxPaidDays()));
        $localCheckIn = StayTime::toCarbon($checkIn)->setTimezone(StayTime::TIMEZONE);
        $windows = [];

        for ($day = 0; $day < $paidDays; $day++) {
            $start = $localCheckIn->addDays($day);
            $end = $start->addHours(self::occupancyHours());
            $weekday = (int) $start->format('w');

            $windows[] = [
                'date' => $start->toDateString(),
                'check_in' => $start->utc()->toIso8601String(),
                'check_out' => $end->utc()->toIso8601String(),
                'is_weekend' => in_array($weekday, [0, 5, 6], true),
            ];
        }

        return $windows;
    }
}
