<?php

namespace Database\Seeders;

use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        foreach ([
            [
                'Room 1',
                'Provides a cozy bunk-style setup with air conditioning, a TV, and a private CR, great for small groups and families.',
                3000,
                4,
                ['TV', 'Private CR', 'Airconditioned'],
            ],
            [
                'Room 2',
                'Offers rustic wooden bunk beds and modern comforts, including AC, TV and a private CR, for a relaxing stay with your family and barkada.',
                3000,
                4,
                ['TV', 'Private CR', 'Airconditioned'],
            ],
            [
                'Room 3',
                'Offers rustic wooden bunk beds and modern comforts, including AC, TV and a private CR, for a relaxing stay with your family and barkada.',
                3000,
                4,
                ['TV', 'Private CR', 'Airconditioned'],
            ],
            [
                'Room 4',
                'Offers warm wooden bunk beds and air-conditioned comfort, an ideal pick for guest who wants a simple, peaceful retreat without the extras.',
                4000,
                10,
                ['Airconditioned'],
            ],
            [
                'Room 5',
                'Features  spacious ,comfty bed with airconditioning and two fans, giving you budget-friendly comfort and a relaxing, easygoing stay.',
                4000,
                10,
                ['Airconditioned', '2 Fans'],
            ],
        ] as [$name, $description, $price, $pax, $amenities]) {
            Service::updateOrCreate(
                ['name' => $name],
                [
                    'description' => $description,
                    'price' => $price,
                    'weekend_price' => $price,
                    'additional_head_weekday_price' => 50,
                    'additional_head_weekend_price' => 100,
                    'weekday_discount_type' => 'fixed',
                    'weekday_discount_value' => 500,
                    'weekend_discount_type' => null,
                    'weekend_discount_value' => null,
                    'status' => 'active',
                    'kind' => 'room',
                    'pax' => $pax,
                    'features' => [],
                    'amenities' => $amenities,
                ],
            );
        }

        $this->call(WholeVillaOfferSeeder::class);

        User::updateOrCreate(
            ['email' => 'dlord0260@gmail.com'],
            [
                'firstname' => 'Dlord',
                'lastname' => 'Admin',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ],
        );

        User::updateOrCreate(
            ['email' => 'dacillohaydee@gmail.com'],
            [
                'firstname' => 'Haydee',
                'lastname' => 'Dacillo',
                'password' => Hash::make('customer123'),
                'role' => 'customer',
                'email_verified_at' => now(),
            ],
        );

        $this->call(DemoReseedSeeder::class);
        $this->call(DevelopmentParitySeeder::class);
    }
}
