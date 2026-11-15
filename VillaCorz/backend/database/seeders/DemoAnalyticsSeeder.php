<?php

namespace Database\Seeders;

use App\Models\PageView;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DemoAnalyticsSeeder extends Seeder
{
    public function run(): void
    {
        if (PageView::count() > 0) {
            return;
        }

        $paths = ['/', '/services', '/services/3', '/services/5', '/bookings', '/about', '/contact'];
        $start = now()->startOfDay()->subDays(89);

        $rows = [];
        $cursor = $start->copy();
        while ($cursor->lte(now())) {
            $dayCount = random_int(8, 42);
            for ($i = 0; $i < $dayCount; $i++) {
                $rows[] = [
                    'path' => $paths[array_rand($paths)],
                    'session_hash' => hash('sha256', 'seed-' . $cursor->toDateString() . '-' . $i),
                    'referrer' => random_int(0, 3) === 0 ? 'https://www.google.com/' : null,
                    'created_at' => $cursor->copy()->addMinutes(random_int(0, 1439)),
                ];
            }
            $cursor->addDay();
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            PageView::insert($chunk);
        }
    }
}
