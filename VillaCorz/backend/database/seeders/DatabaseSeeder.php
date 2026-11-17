<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(WholeVillaOfferSeeder::class);
        $this->call(DemoCustomerSeeder::class);
        $this->call(DemoDemandSeeder::class);
        $this->call(DemoAnalyticsSeeder::class);
    }
}
