<?php

namespace Tests\Feature;

use App\Mail\PasswordResetCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AccountSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_updates_require_authentication_and_current_password(): void
    {
        $user = User::factory()->create([
            'password' => 'CurrentPassword123',
        ]);

        $this->putJson('/api/account/profile', $this->profileData())
            ->assertUnauthorized();

        $this->actingAs($user)
            ->putJson('/api/account/profile', [
                ...$this->profileData(),
                'current_password' => 'wrong-password',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->actingAs($user)
            ->putJson('/api/account/profile', $this->profileData())
            ->assertOk()
            ->assertJsonPath('user.phone_number', '+639171234567');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'firstname' => 'Updated',
            'lastname' => 'Guest',
            'phone_number' => '+639171234567',
        ]);
    }

    public function test_password_change_requires_the_current_password_and_confirmation(): void
    {
        $user = User::factory()->create([
            'password' => 'CurrentPassword123',
        ]);

        $this->actingAs($user)
            ->putJson('/api/account/password', [
                'current_password' => 'incorrect',
                'password' => 'NewPassword123',
                'password_confirmation' => 'NewPassword123',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->actingAs($user)
            ->putJson('/api/account/password', [
                'current_password' => 'CurrentPassword123',
                'password' => 'NewPassword123',
                'password_confirmation' => 'NewPassword123',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('NewPassword123', $user->fresh()->password));
    }

    public function test_email_code_can_reset_password_once(): void
    {
        Mail::fake();
        $user = User::factory()->create(['password' => 'CurrentPassword123']);
        $developmentCode = null;

        $response = $this->postJson('/api/forgot-password', [
            'email' => $user->email,
        ])->assertAccepted()
            ->assertJsonPath(
                'message',
                'If an account exists for that email, a password reset code has been sent.',
            );

        Mail::assertSent(PasswordResetCode::class, function (PasswordResetCode $mail) use (&$developmentCode) {
            $developmentCode = $mail->code;

            return true;
        });

        $this->postJson('/api/reset-password', [
            'reset_id' => $response->json('reset_id'),
            'code' => $developmentCode,
            'password' => 'RecoveredPassword123',
            'password_confirmation' => 'RecoveredPassword123',
        ])->assertOk();

        $this->assertTrue(Hash::check(
            'RecoveredPassword123',
            $user->fresh()->password,
        ));

        $this->postJson('/api/reset-password', [
            'reset_id' => $response->json('reset_id'),
            'code' => $developmentCode,
            'password' => 'AnotherPassword123',
            'password_confirmation' => 'AnotherPassword123',
        ])->assertUnprocessable();
    }

    public function test_password_reset_request_does_not_disclose_unknown_emails(): void
    {
        Mail::fake();

        $this->postJson('/api/forgot-password', [
            'email' => 'not-registered@example.test',
        ])->assertAccepted()
            ->assertJsonPath(
                'message',
                'If an account exists for that email, a password reset code has been sent.',
            )
            ->assertJsonStructure(['reset_id', 'expires_in']);

        Mail::assertNothingSent();
    }

    public function test_invalid_reset_codes_are_limited_to_five_attempts(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $response = $this->postJson('/api/forgot-password', [
            'email' => $user->email,
        ])->assertAccepted();

        for ($attempt = 0; $attempt < 4; $attempt++) {
            $this->postJson('/api/reset-password', [
                'reset_id' => $response->json('reset_id'),
                'code' => '000000',
                'password' => 'RecoveredPassword123',
                'password_confirmation' => 'RecoveredPassword123',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/reset-password', [
            'reset_id' => $response->json('reset_id'),
            'code' => '000000',
            'password' => 'RecoveredPassword123',
            'password_confirmation' => 'RecoveredPassword123',
        ])->assertTooManyRequests();
    }

    private function profileData(): array
    {
        return [
            'firstname' => 'Updated',
            'lastname' => 'Guest',
            'phone_number' => '0917 123 4567',
            'current_password' => 'CurrentPassword123',
        ];
    }
}
