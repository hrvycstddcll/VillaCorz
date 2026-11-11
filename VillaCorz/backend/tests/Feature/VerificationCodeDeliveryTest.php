<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class VerificationCodeDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_log_mailer_returns_a_code_for_the_development_verification_ui(): void
    {
        $this->app->detectEnvironment(fn () => 'local');
        config([
            'app.env' => 'local',
            'mail.default' => 'log',
        ]);
        Mail::fake();

        $this->postJson('/api/register', $this->registrationData())
            ->assertOk()
            ->assertJsonPath('verification_delivery', 'log')
            ->assertJsonPath('message', 'A verification code is ready for local development.')
            ->assertJsonStructure(['development_code', 'registration_id', 'expires_in']);
    }

    public function test_verification_code_is_not_returned_outside_local_environment(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config([
            'app.env' => 'production',
            'mail.default' => 'smtp',
        ]);
        Mail::fake();

        $this->postJson('/api/register', $this->registrationData())
            ->assertOk()
            ->assertJsonPath('verification_delivery', 'email')
            ->assertJsonMissingPath('development_code');
    }

    private function registrationData(): array
    {
        return [
            'firstname' => 'Test',
            'lastname' => 'Guest',
            'email' => 'guest-'.uniqid().'@example.test',
            'password' => 'TestPassword123',
        ];
    }
}
