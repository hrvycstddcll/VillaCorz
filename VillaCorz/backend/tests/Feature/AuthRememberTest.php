<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthRememberTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_issues_a_token_that_authenticates_and_logout_revokes_it(): void
    {
        $user = User::factory()->create([
            'password' => 'CorrectPassword123',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'CorrectPassword123',
        ])->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonStructure(['token', 'expires_at']);

        $token = $response->json('token');

        $this->withToken($token)->getJson('/api/user')->assertOk();
        $this->assertNotNull($user->tokens()->first()?->expires_at);

        $this->withToken($token)->postJson('/api/logout')->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => explode('|', $token, 2)[0],
        ]);
        $this->app['auth']->forgetGuards();
        $this->flushSession();
        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_login_from_spa_origin_does_not_require_csrf_cookie(): void
    {
        $user = User::factory()->create([
            'password' => 'CorrectPassword123',
        ]);

        $this->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Referer' => 'http://localhost:5173/',
        ])->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'CorrectPassword123',
        ])->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('token_type', 'Bearer');
    }

    public function test_remember_me_issues_a_longer_lived_token(): void
    {
        $user = User::factory()->create([
            'password' => 'CorrectPassword123',
        ]);

        $session = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'CorrectPassword123',
        ])->assertOk();

        $remembered = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'CorrectPassword123',
            'remember' => true,
        ])->assertOk();

        $this->assertTrue(
            $remembered->json('expires_at') > $session->json('expires_at'),
        );
    }

    public function test_login_accepts_email_with_different_capitalization(): void
    {
        $user = User::factory()->create([
            'email' => 'Harvey.Custodio@example.test',
            'password' => 'CorrectPassword123',
        ]);

        $this->postJson('/api/login', [
            'email' => 'harvey.custodio@example.test',
            'password' => 'CorrectPassword123',
        ])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);
    }
}
