<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class WholeVillaOfferSeeder extends Seeder
{
    public function run(): void
    {
        Service::updateOrCreate(
            ['kind' => 'exclusive'],
            [
                'created_by' => null,
                'name' => 'The Whole Villa',
                'description' => 'Make the whole beach house yours. Gather in the shared spaces, unwind in comfortable rooms, and enjoy an easygoing seaside stay with your group.',
                'price' => 15500,
                'weekend_price' => 17000,
                'additional_head_weekday_price' => 50,
                'additional_head_weekend_price' => 100,
                'weekday_discount_type' => 'fixed',
                'weekday_discount_value' => 1500,
                'weekend_discount_type' => null,
                'weekend_discount_value' => null,
                'pax' => 35,
                'features' => [],
                'amenities' => ['TV', 'Private CR', 'Airconditioned', '2 Fans'],
                'status' => 'active',
            ],
        );
    }
}
