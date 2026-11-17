<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Queries\Offers\OfferMetricsQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOfferController extends Controller
{
    private const ALLOWED_RANGES = [7, 30, 90];

    public function __invoke(
        Request $request,
        OfferMetricsQuery $metricsQuery,
    ): JsonResponse {
        $range = (int) $request->integer('range', 30);
        if (! in_array($range, self::ALLOWED_RANGES, true)) {
            $range = 30;
        }

        $start = now()->startOfDay()->subDays($range - 1);
        $end = now()->endOfDay();

        $services = Service::query()
            ->with('images')
            ->withAvg('reviews as rating_average', 'rating')
            ->withCount(['reviews as reviews_count'])
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'services' => $services,
                'offer_metrics' => $metricsQuery->metricsFor(
                    $services,
                    $range,
                    $start,
                    $end,
                ),
                'availability' => $metricsQuery->availability(),
                'range' => $range,
            ],
        ]);
    }
}
