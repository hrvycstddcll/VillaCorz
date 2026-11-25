<?php

namespace Tests\Feature;

use App\Models\PendingRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
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
            ->assertJsonPath('message', 'A new verification code has been written to the local application log.')
            ->assertJsonMissingPath('development_code');
    }

    public function test_registration_can_be_verified_after_cache_flush(): void
    {
        $otp = null;
        Mail::shouldReceive('send')
            ->once()
            ->andReturnUsing(function ($view, $data) use (&$otp): void {
                $this->assertSame('emails.verify-otp', $view);
                $otp = $data['otp'];
            });

        $registrationData = $this->registrationData();
        $registration = $this->postJson('/api/register', $registrationData)
            ->assertOk()
            ->assertJsonPath('code', 'verification_code_sent')
            ->json();

        $this->assertIsString($otp);
        $this->assertSame(1, PendingRegistration::count());

        Cache::flush();

        $this->postJson('/api/verify-otp', [
            'registration_id' => $registration['registration_id'],
            'otp' => $otp,
        ])
            ->assertCreated()
            ->assertJsonPath('code', 'email_verified')
            ->assertJsonPath('user.email', $registrationData['email']);

        $this->assertSame(0, PendingRegistration::count());

        $this->postJson('/api/login', [
            'email' => $registrationData['email'],
            'password' => $registrationData['password'],
        ])
            ->assertOk()
            ->assertJsonPath('user.email', $registrationData['email']);
    }

    public function test_login_returns_pending_verification_when_registration_is_unfinished(): void
    {
        Mail::fake();

        $registrationData = $this->registrationData();
        $registration = $this->postJson('/api/register', $registrationData)
            ->assertOk()
            ->json();

        $this->postJson('/api/login', [
            'email' => $registrationData['email'],
            'password' => $registrationData['password'],
        ])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'verification_pending')
            ->assertJsonPath('registration_id', $registration['registration_id']);
    }

    public function test_expired_pending_registration_cannot_be_verified(): void
    {
        Mail::fake();

        $registration = $this->postJson('/api/register', $this->registrationData())
            ->assertOk()
            ->json();

        PendingRegistration::query()->update([
            'expires_at' => now()->subMinute(),
        ]);

        $this->postJson('/api/verify-otp', [
            'registration_id' => $registration['registration_id'],
            'otp' => '123456',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'registration_expired');

        $this->assertSame(0, PendingRegistration::count());
    }

    public function test_five_incorrect_otps_lock_the_pending_registration(): void
    {
        Mail::fake();

        $registration = $this->postJson('/api/register', $this->registrationData())
            ->assertOk()
            ->json();

        for ($attempt = 1; $attempt <= 4; $attempt += 1) {
            $this->postJson('/api/verify-otp', [
                'registration_id' => $registration['registration_id'],
                'otp' => '000000',
            ])
                ->assertUnprocessable()
                ->assertJsonPath('code', 'invalid_otp')
                ->assertJsonPath('attempts_remaining', 5 - $attempt);
        }

        $this->postJson('/api/verify-otp', [
            'registration_id' => $registration['registration_id'],
            'otp' => '000000',
        ])
            ->assertStatus(429)
            ->assertJsonPath('code', 'too_many_attempts');

        $this->assertSame(0, PendingRegistration::count());
    }

    public function test_failed_resend_keeps_the_previous_otp_valid(): void
    {
        $otp = null;
        $calls = 0;
        Mail::shouldReceive('send')
            ->times(2)
            ->andReturnUsing(function ($view, $data) use (&$otp, &$calls): void {
                $calls += 1;

                if ($calls === 1) {
                    $otp = $data['otp'];

                    return;
                }

                throw new RuntimeException('mail unavailable');
            });

        $registration = $this->postJson('/api/register', $this->registrationData())
            ->assertOk()
            ->json();

        $this->postJson('/api/resend-otp', [
            'registration_id' => $registration['registration_id'],
        ])
            ->assertStatus(500)
            ->assertJsonPath('code', 'mail_send_failed');

        $this->postJson('/api/verify-otp', [
            'registration_id' => $registration['registration_id'],
            'otp' => $otp,
        ])
            ->assertCreated()
            ->assertJsonPath('code', 'email_verified');
    }

    public function test_resend_replaces_the_otp_and_resets_attempts(): void
    {
        $otps = [];
        Mail::shouldReceive('send')
            ->times(2)
            ->andReturnUsing(function ($view, $data) use (&$otps): void {
                $otps[] = $data['otp'];
            });

        $registration = $this->postJson('/api/register', $this->registrationData())
            ->assertOk()
            ->json();

        $this->postJson('/api/verify-otp', [
            'registration_id' => $registration['registration_id'],
            'otp' => '000000',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('attempts_remaining', 4);

        $this->postJson('/api/resend-otp', [
            'registration_id' => $registration['registration_id'],
        ])
            ->assertOk()
            ->assertJsonPath('code', 'verification_code_resent');

        $this->postJson('/api/verify-otp', [
            'registration_id' => $registration['registration_id'],
            'otp' => $otps[1],
        ])
            ->assertCreated()
            ->assertJsonPath('code', 'email_verified');
    }

    public function test_register_rejects_an_existing_email_with_different_capitalization(): void
    {
        Mail::fake();

        User::factory()->create([
            'email' => 'Harvey.Custodio@example.test',
        ]);

        $registrationData = $this->registrationData();
        $registrationData['email'] = 'harvey.custodio@example.test';

        $this->postJson('/api/register', $registrationData)
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.email.0',
                'An account with this email already exists. Please log in.',
            );

        Mail::assertNothingSent();
    }

    public function test_duplicate_pending_registrations_reuse_the_same_registration_id(): void
    {
        Mail::fake();

        $registrationData = $this->registrationData();

        $first = $this->postJson('/api/register', $registrationData)
            ->assertOk()
            ->json();

        $second = $this->postJson('/api/register', array_merge($registrationData, [
            'email' => strtoupper($registrationData['email']),
        ]))
            ->assertOk()
            ->json();

        $this->assertSame($first['registration_id'], $second['registration_id']);
        $this->assertSame(1, PendingRegistration::count());
    }

    public function test_resend_rejects_a_pending_registration_after_the_email_becomes_an_account(): void
    {
        Mail::fake();

        $registrationData = $this->registrationData();
        $registration = $this->postJson('/api/register', $registrationData)
            ->assertOk()
            ->json();

        User::factory()->create([
            'email' => strtoupper($registrationData['email']),
        ]);

        $this->postJson('/api/resend-otp', [
            'registration_id' => $registration['registration_id'],
        ])
            ->assertStatus(409)
            ->assertJsonPath('message', 'An account with this email already exists. Please log in.');
    }

    public function test_register_verify_and_login_normalize_email_capitalization(): void
    {
        $otp = null;
        Mail::shouldReceive('send')
            ->once()
            ->andReturnUsing(function ($view, $data) use (&$otp): void {
                $this->assertSame('emails.verify-otp', $view);
                $otp = $data['otp'];
            });

        $registrationData = $this->registrationData();
        $registrationData['email'] = 'Mixed.Case-'.uniqid().'@Example.Test';
        $normalizedEmail = strtolower($registrationData['email']);

        $registration = $this->postJson('/api/register', $registrationData)
            ->assertOk()
            ->json();

        $this->postJson('/api/verify-otp', [
            'registration_id' => $registration['registration_id'],
            'otp' => $otp,
        ])
            ->assertCreated()
            ->assertJsonPath('user.email', $normalizedEmail);

        $this->postJson('/api/login', [
            'email' => strtoupper($normalizedEmail),
            'password' => $registrationData['password'],
        ])
            ->assertOk()
            ->assertJsonPath('user.email', $normalizedEmail);
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
