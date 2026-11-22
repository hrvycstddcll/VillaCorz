<?php

namespace App\Services;

use App\Models\Service;
use App\Support\StayPolicy;
use DateTimeInterface;
use Illuminate\Support\Collection;

class PricingService
{
    /**
     * Quote a stay from authoritative database prices.
     *
     * Each paid day is a 22-hour occupancy window starting at the guest's
     * check-in clock time. Weekend pricing applies when the paid-day start
     * (PHT) falls on Friday, Saturday, or Sunday. Discounts are applied
     * before paid-day totals are added. Additional-head fees are never
     * discounted.
     *
     * @param  Collection<int, Service>  $services
     * @param  array<int, int>  $guestsByServiceId
     * @return array{
     *     paid_days: int,
     *     nights: int,
     *     rooms: array<int, array{
     *         service: Service,
     *         weekday_price: float,
     *         weekend_price: float,
     *         additional_heads: int,
     *         additional_head_weekday_price: float,
     *         additional_head_weekend_price: float,
     *         additional_head_total: float,
     *         line_total: float
     *     }>,
     *     subtotal: float,
     *     total: float
     * }
     */
    public function quote(
        Collection $services,
        DateTimeInterface|string $checkIn,
        int $paidDays,
        array $guestsByServiceId = [],
    ): array
    {
        $paidDays = max(1, min($paidDays, StayPolicy::maxPaidDays()));
        $windows = StayPolicy::windows($checkIn, $paidDays);

        $rooms = [];
        $subtotal = 0.0;

        foreach ($services as $service) {
            $weekdayPrice = $this->discountedPrice(
                (float) $service->price,
                $service->weekday_discount_type,
                $service->weekday_discount_value,
            );

            $weekendPrice = $this->discountedPrice(
                (float) ($service->weekend_price ?? $service->price),
                $service->weekend_discount_type,
                $service->weekend_discount_value,
            );

            $guests = (int) ($guestsByServiceId[$service->id] ?? 0);
            $pax = $service->pax !== null ? (int) $service->pax : null;
            $additionalHeads = $pax !== null ? max(0, $guests - $pax) : 0;

            $additionalHeadWeekdayPrice = max(
                0,
                (float) ($service->additional_head_weekday_price ?? 0),
            );

            $additionalHeadWeekendPrice = max(
                0,
                (float) ($service->additional_head_weekend_price ?? 0),
            );

            $lineTotal = 0.0;
            $additionalHeadTotal = 0.0;

            foreach ($windows as $window) {
                $isWeekend = (bool) $window['is_weekend'];
                $dayPrice = $isWeekend ? $weekendPrice : $weekdayPrice;
                $dayAdditionalHeadPrice = $isWeekend
                    ? $additionalHeadWeekendPrice
                    : $additionalHeadWeekdayPrice;
                $dayAdditionalHeadTotal = $additionalHeads * $dayAdditionalHeadPrice;

                $lineTotal += $dayPrice + $dayAdditionalHeadTotal;
                $additionalHeadTotal += $dayAdditionalHeadTotal;
            }

            $lineTotal = round($lineTotal, 2);
            $additionalHeadTotal = round($additionalHeadTotal, 2);
            $subtotal += $lineTotal;

            $rooms[] = [
                'service' => $service,
                'weekday_price' => $weekdayPrice,
                'weekend_price' => $weekendPrice,
                'additional_heads' => $additionalHeads,
                'additional_head_weekday_price' => round($additionalHeadWeekdayPrice, 2),
                'additional_head_weekend_price' => round($additionalHeadWeekendPrice, 2),
                'additional_head_total' => $additionalHeadTotal,
                'line_total' => $lineTotal,
            ];
        }

        $subtotal = round($subtotal, 2);

        return [
            'paid_days' => $paidDays,
            'nights' => $paidDays,
            'rooms' => $rooms,
            'subtotal' => $subtotal,
            'total' => $subtotal,
        ];
    }

    private function discountedPrice(
        float $price,
        ?string $type,
        mixed $value,
    ): float {
        $basePrice = max(0, round($price, 2));

        if (! in_array($type, ['percent', 'fixed'], true) || $value === null || $value === '') {
            return $basePrice;
        }

        $rawValue = (float) $value;

        if ($rawValue <= 0) {
            return $basePrice;
        }

        $rawAmount = $type === 'percent'
            ? ($basePrice * $rawValue) / 100
            : $rawValue;

        $discountAmount = round(min($rawAmount, $basePrice), 2);

        if ($discountAmount <= 0) {
            return $basePrice;
        }

        return round($basePrice - $discountAmount, 2);
    }
}
