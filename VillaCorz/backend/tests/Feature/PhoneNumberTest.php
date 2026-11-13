<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserPhoneNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PhoneNumberTest extends TestCase
{
    use RefreshDatabase;

    private const FIRST_NUMBER = '+639171111111';

    private const SECOND_NUMBER = '+639182222222';

    public function test_the_first_saved_number_becomes_primary_and_syncs_the_account(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/account/phone-numbers', [
                'phone_number' => self::FIRST_NUMBER,
            ])
            ->assertCreated()
            ->assertJsonPath('phone_number.phone_number', self::FIRST_NUMBER)
            ->assertJsonPath('phone_number.is_primary', true)
            ->assertJsonPath('user.phone_number', self::FIRST_NUMBER)
            ->assertJsonPath('user.phone_numbers.0.phone_number', self::FIRST_NUMBER);

        $this->assertDatabaseHas('user_phone_numbers', [
            'user_id' => $user->id,
            'phone_number' => self::FIRST_NUMBER,
            'is_primary' => true,
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'phone_number' => self::FIRST_NUMBER,
        ]);

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $user->id,
            'action' => 'phone_number_added',
        ]);
    }

    public function test_additional_numbers_do_not_replace_the_primary_number(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/account/phone-numbers', [
            'phone_number' => self::FIRST_NUMBER,
        ])->assertCreated();

        $this->actingAs($user)
            ->postJson('/api/account/phone-numbers', [
                'phone_number' => self::SECOND_NUMBER,
            ])
            ->assertCreated()
            ->assertJsonPath('phone_number.is_primary', false)
            ->assertJsonPath('user.phone_number', self::FIRST_NUMBER);

        $this->assertSame(
            2,
            UserPhoneNumber::where('user_id', $user->id)->count(),
        );
    }

    public function test_only_one_number_can_be_primary_at_a_time(): void
    {
        $user = User::factory()->create();
        $first = $this->addNumber($user, self::FIRST_NUMBER);
        $second = $this->addNumber($user, self::SECOND_NUMBER);

        $this->actingAs($user)
            ->putJson("/api/account/phone-numbers/{$second->id}", [
                'is_primary' => true,
            ])
            ->assertOk()
            ->assertJsonPath('phone_number.is_primary', true)
            ->assertJsonPath('user.phone_number', self::SECOND_NUMBER);

        $this->assertFalse($first->fresh()->is_primary);
        $this->assertTrue($second->fresh()->is_primary);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'phone_number' => self::SECOND_NUMBER,
        ]);
    }

    public function test_removing_the_primary_number_promotes_the_next_number(): void
    {
        $user = User::factory()->create();
        $first = $this->addNumber($user, self::FIRST_NUMBER);
        $second = $this->addNumber($user, self::SECOND_NUMBER);

        $this->actingAs($user)
            ->deleteJson("/api/account/phone-numbers/{$first->id}")
            ->assertOk()
            ->assertJsonPath('user.phone_number', self::SECOND_NUMBER);

        $this->assertDatabaseMissing('user_phone_numbers', ['id' => $first->id]);
        $this->assertTrue($second->fresh()->is_primary);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'phone_number' => self::SECOND_NUMBER,
        ]);
    }

    public function test_phone_numbers_are_isolated_per_account(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $number = $this->addNumber($owner, self::FIRST_NUMBER);

        $this->actingAs($stranger)
            ->putJson("/api/account/phone-numbers/{$number->id}", [
                'phone_number' => self::SECOND_NUMBER,
            ])
            ->assertNotFound();

        $this->actingAs($stranger)
            ->deleteJson("/api/account/phone-numbers/{$number->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('user_phone_numbers', [
            'id' => $number->id,
            'phone_number' => self::FIRST_NUMBER,
        ]);
    }

    public function test_duplicate_numbers_and_invalid_numbers_are_rejected(): void
    {
        $user = User::factory()->create();
        $this->addNumber($user, self::FIRST_NUMBER);

        $this->actingAs($user)
            ->postJson('/api/account/phone-numbers', [
                'phone_number' => self::FIRST_NUMBER,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('phone_number');

        // A different local spelling of the same number is still a duplicate.
        $this->actingAs($user)
            ->postJson('/api/account/phone-numbers', [
                'phone_number' => '0917 111 1111',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('phone_number');

        $this->actingAs($user)
            ->postJson('/api/account/phone-numbers', [
                'phone_number' => 'not-a-number',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('phone_number');
    }

    public function test_local_numbers_are_converted_to_e164_before_storage(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/account/phone-numbers', [
                'phone_number' => '0917 111 1111',
            ])
            ->assertCreated()
            ->assertJsonPath('phone_number.phone_number', self::FIRST_NUMBER)
            ->assertJsonPath('user.phone_number', self::FIRST_NUMBER);

        $this->assertDatabaseHas('user_phone_numbers', [
            'user_id' => $user->id,
            'phone_number' => self::FIRST_NUMBER,
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'phone_number' => self::FIRST_NUMBER,
        ]);

        $this->actingAs($user)
            ->putJson("/api/account/phone-numbers/{$this->addNumber($user, self::SECOND_NUMBER)->id}", [
                'phone_number' => '0918 222 2222',
            ])
            ->assertOk()
            ->assertJsonPath('phone_number.phone_number', self::SECOND_NUMBER);
    }

    public function test_legacy_profile_updates_replace_the_primary_number(): void
    {
        $user = User::factory()->create([
            'password' => 'CurrentPassword123',
        ]);
        $this->addNumber($user, self::FIRST_NUMBER);

        $this->actingAs($user)
            ->putJson('/api/account/profile', [
                'firstname' => 'Updated',
                'lastname' => 'Guest',
                'phone_number' => self::SECOND_NUMBER,
                'current_password' => 'CurrentPassword123',
            ])
            ->assertOk()
            ->assertJsonPath('user.phone_number', self::SECOND_NUMBER);

        $this->assertSame(
            1,
            UserPhoneNumber::where('user_id', $user->id)->count(),
        );
        $this->assertDatabaseHas('user_phone_numbers', [
            'user_id' => $user->id,
            'phone_number' => self::SECOND_NUMBER,
            'is_primary' => true,
        ]);
    }

    public function test_a_saved_number_can_be_verified_with_an_emailed_code(): void
    {
        $user = User::factory()->create();
        $number = $this->addNumber($user, self::FIRST_NUMBER);

        $this->actingAs($user)
            ->postJson("/api/account/phone-numbers/{$number->id}/verification")
            ->assertOk()
            ->assertJsonPath('verification_delivery', 'email')
            ->assertJsonPath('expires_in', 600);

        $messages = Mail::mailer()->getSymfonyTransport()->messages();
        $this->assertCount(1, $messages);

        $email = $messages->last()->getOriginalMessage();
        $this->assertSame([$user->email], array_map(
            fn ($address) => $address->getAddress(),
            $email->getTo(),
        ));

        $otp = $this->extractOtp((string) $email->getHtmlBody());

        $this->actingAs($user)
            ->postJson("/api/account/phone-numbers/{$number->id}/verification/confirm", [
                'otp' => $otp,
            ])
            ->assertOk()
            ->assertJsonPath('phone_number.verified_at', fn ($value) => $value !== null);

        $this->assertNotNull($number->fresh()->verified_at);
        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $user->id,
            'action' => 'phone_number_verified',
        ]);
    }

    public function test_incorrect_codes_are_limited_and_then_expire(): void
    {
        $user = User::factory()->create();
        $number = $this->addNumber($user, self::FIRST_NUMBER);

        $this->actingAs($user)
            ->postJson("/api/account/phone-numbers/{$number->id}/verification")
            ->assertOk();

        for ($attempt = 0; $attempt < 4; $attempt++) {
            $this->actingAs($user)
                ->postJson("/api/account/phone-numbers/{$number->id}/verification/confirm", [
                    'otp' => '000000',
                ])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('otp');
        }

        $this->actingAs($user)
            ->postJson("/api/account/phone-numbers/{$number->id}/verification/confirm", [
                'otp' => '000000',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.otp.0', 'Too many incorrect attempts. Please request a new code.');

        $this->actingAs($user)
            ->postJson("/api/account/phone-numbers/{$number->id}/verification/confirm", [
                'otp' => '000000',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('otp');

        $this->assertNull($number->fresh()->verified_at);
    }

    public function test_changing_a_number_resets_its_verification(): void
    {
        $user = User::factory()->create();
        $number = $this->addNumber($user, self::FIRST_NUMBER);

        $this->actingAs($user)
            ->postJson("/api/account/phone-numbers/{$number->id}/verification")
            ->assertOk();

        $otp = $this->extractOtp(
            (string) Mail::mailer()
                ->getSymfonyTransport()
                ->messages()
                ->last()
                ->getOriginalMessage()
                ->getHtmlBody(),
        );

        $this->actingAs($user)
            ->postJson("/api/account/phone-numbers/{$number->id}/verification/confirm", [
                'otp' => $otp,
            ])
            ->assertOk();

        $this->assertNotNull($number->fresh()->verified_at);

        $this->actingAs($user)
            ->putJson("/api/account/phone-numbers/{$number->id}", [
                'phone_number' => self::SECOND_NUMBER,
            ])
            ->assertOk()
            ->assertJsonPath('phone_number.phone_number', self::SECOND_NUMBER)
            ->assertJsonPath('phone_number.verified_at', null);

        $this->assertNull($number->fresh()->verified_at);
    }

    public function test_the_account_payload_includes_every_saved_number(): void
    {
        $user = User::factory()->create();
        $this->addNumber($user, self::FIRST_NUMBER);
        $this->addNumber($user, self::SECOND_NUMBER);

        $this->actingAs($user)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('phone_number', self::FIRST_NUMBER)
            ->assertJsonCount(2, 'phone_numbers')
            ->assertJsonPath('phone_numbers.0.phone_number', self::FIRST_NUMBER)
            ->assertJsonPath('phone_numbers.0.is_primary', true)
            ->assertJsonPath('phone_numbers.1.phone_number', self::SECOND_NUMBER)
            ->assertJsonPath('phone_numbers.1.is_primary', false);
    }

    public function test_phone_number_management_requires_authentication(): void
    {
        $this->getJson('/api/account/phone-numbers')->assertUnauthorized();
        $this->postJson('/api/account/phone-numbers', [
            'phone_number' => self::FIRST_NUMBER,
        ])->assertUnauthorized();
    }

    private function addNumber(User $user, string $number): UserPhoneNumber
    {
        $this->actingAs($user)
            ->postJson('/api/account/phone-numbers', [
                'phone_number' => $number,
            ])
            ->assertCreated();

        return UserPhoneNumber::where('user_id', $user->id)
            ->where('phone_number', $number)
            ->firstOrFail();
    }

    private function extractOtp(string $html): string
    {
        preg_match('/letter-spacing:8px;">\s*(\d{6})\s*<\/span>/', $html, $matches);

        $this->assertArrayHasKey(1, $matches, 'Unable to read the OTP from the email.');

        return $matches[1];
    }
}