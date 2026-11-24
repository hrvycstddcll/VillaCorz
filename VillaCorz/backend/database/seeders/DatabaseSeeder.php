<?php

namespace Database\Seeders;

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
