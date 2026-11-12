<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class WholeVillaOfferSeeder extends Seeder
{
    /**
     * Create the exclusive whole-villa offer once so it can be managed from
     * the Offers page. Existing exclusive offers are left untouched.
     */
    public function run(): void
    {
        Service::firstOrCreate(
            ['kind' => 'exclusive'],
            [
                'created_by' => null,
                'name' => 'The Whole Villa',
                'description' => 'Make the whole beach house yours. Gather in the shared spaces, unwind in comfortable rooms, and enjoy an easygoing seaside stay with your group.',
                'price' => 15500,
                'weekend_price' => 17000,
                'pax' => null,
                'features' => [],
                'amenities' => ['TV', 'Private CR', 'Airconditioned', '2 Fans'],
                'status' => 'active',
            ],
        );
    }
}
