<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginThrottleTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_attempts_are_rate_limited(): void
    {
        $user = User::factory()->create([
            'password' => 'CorrectPassword123',
        ]);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'IncorrectPassword123',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'CorrectPassword123',
        ])->assertTooManyRequests();
    }
}
