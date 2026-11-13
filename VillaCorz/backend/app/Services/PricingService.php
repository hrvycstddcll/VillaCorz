<?php

namespace App\Services;

use App\Models\Service;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class PricingService
{
    /**
     * Quote a stay from the authoritative database prices.
     *
     * Weekend nights follow the same rule as the frontend: Friday, Saturday
     * and Sunday use the weekend price. Every other night uses the weekday
     * price. Discounts are applied before the nightly totals are added.
     *
     * @param  Collection<int, Service>  $services
     * @return array{
     *     nights: int,
     *     rooms: array<int, array{service: Service, weekday_price: float, weekend_price: float, line_total: float}>,
     *     subtotal: float,
     *     total: float
     * }
     */
    public function quote(Collection $services, string $checkIn, string $checkOut): array
    {
        $start = CarbonImmutable::parse($checkIn, 'UTC')->startOfDay();
        $end = CarbonImmutable::parse($checkOut, 'UTC')->startOfDay();
        $nights = max(0, (int) $start->diffInDays($end));

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

            $lineTotal = 0.0;

            for ($date = $start; $date->lt($end); $date = $date->addDay()) {
                $dayOfWeek = (int) $date->format('w');
                $isWeekend = in_array($dayOfWeek, [0, 5, 6], true);
                $lineTotal += $isWeekend ? $weekendPrice : $weekdayPrice;
            }

            $lineTotal = round($lineTotal, 2);
            $subtotal += $lineTotal;

            $rooms[] = [
                'service' => $service,
                'weekday_price' => $weekdayPrice,
                'weekend_price' => $weekendPrice,
                'line_total' => $lineTotal,
            ];
        }

        $subtotal = round($subtotal, 2);

        return [
            'nights' => $nights,
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
