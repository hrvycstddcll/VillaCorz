<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class VerificationCodeDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_log_mailer_does_not_return_a_code_by_default(): void
    {
        $this->app->detectEnvironment(fn () => 'local');
        config([
            'app.env' => 'local',
            'mail.default' => 'log',
        ]);
        $this->assertFalse((bool) config('services.verification.expose_development_code'));
        Mail::fake();

        $this->postJson('/api/register', $this->registrationData())
            ->assertOk()
            ->assertJsonPath('verification_delivery', 'log')
            ->assertJsonPath('message', 'A verification code has been written to the application log.')
            ->assertJsonMissingPath('development_code');
    }

    public function test_local_log_mailer_returns_a_code_only_when_explicitly_enabled(): void
    {
        $this->app->detectEnvironment(fn () => 'local');
        config([
            'app.env' => 'local',
            'mail.default' => 'log',
            'services.verification.expose_development_code' => true,
        ]);
        Mail::fake();

        $response = $this->postJson('/api/register', $this->registrationData())
            ->assertOk()
            ->assertJsonPath('verification_delivery', 'log')
            ->assertJsonPath('message', 'A verification code is ready for local development.')
            ->assertJsonStructure(['development_code', 'registration_id', 'expires_in']);

        $this->assertMatchesRegularExpression('/^\d{6}$/', $response->json('development_code'));
    }

    public function test_verification_code_is_not_returned_outside_local_environment_even_when_enabled(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config([
            'app.env' => 'production',
            'mail.default' => 'log',
            'services.verification.expose_development_code' => true,
        ]);
        Mail::fake();

        $this->postJson('/api/register', $this->registrationData())
            ->assertOk()
            ->assertJsonPath('verification_delivery', 'email')
            ->assertJsonMissingPath('development_code');
    }

    public function test_local_mailer_does_not_return_a_code_when_it_is_not_the_log_mailer(): void
    {
        $this->app->detectEnvironment(fn () => 'local');
        config([
            'app.env' => 'local',
            'mail.default' => 'smtp',
            'services.verification.expose_development_code' => true,
        ]);
        Mail::fake();

        $this->postJson('/api/register', $this->registrationData())
            ->assertOk()
            ->assertJsonPath('verification_delivery', 'email')
            ->assertJsonMissingPath('development_code');
    }

    public function test_resend_does_not_return_a_code_without_the_explicit_opt_in(): void
    {
        $this->app->detectEnvironment(fn () => 'local');
        config([
            'app.env' => 'local',
            'mail.default' => 'log',
            'services.verification.expose_development_code' => false,
        ]);
        Mail::fake();

        $registration = $this->postJson('/api/register', $this->registrationData())
            ->assertOk()
            ->json();

        $this->postJson('/api/resend-otp', [
            'registration_id' => $registration['registration_id'],
        ])
            ->assertOk()
            ->assertJsonPath('verification_delivery', 'log')
            ->assertJsonPath('message', 'A new verification code has been written to the application log.')
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
