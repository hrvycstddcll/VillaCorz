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
            ['Room 1', 3000, 2, ['TV', 'Private CR', 'Airconditioned']],
            ['Room 2', 3000, 2, ['TV', 'Private CR', 'Airconditioned']],
            ['Room 3', 3000, 2, ['TV', 'Private CR', 'Airconditioned']],
            ['Room 4', 4000, 6, ['TV', 'Private CR', 'Airconditioned']],
            ['Room 5', 4000, 6, ['TV', 'Private CR', 'Airconditioned']],
        ] as [$name, $price, $pax, $amenities]) {
            Service::updateOrCreate(
                ['name' => $name],
                [
                    'description' => 'A comfortable seaside room with air conditioning, a TV, and a private CR.',
                    'price' => $price,
                    'weekend_price' => null,
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
                'password' => Hash::make('QZ&t5Gg?l-3?Ho-c2F'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ],
        );

        User::updateOrCreate(
            ['email' => 'dacillohaydee@gmail.com'],
            [
                'firstname' => 'Haydee',
                'lastname' => 'Dacillo',
                'password' => Hash::make('|AbrB)HK<KXGiJ|7[%'),
                'role' => 'customer',
                'email_verified_at' => now(),
            ],
        );

        $this->call(DemoReseedSeeder::class);
    }
}
