<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenHeaderFallbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_protected_route_accepts_token_from_fallback_header(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('spa')->plainTextToken;

        $this->withHeader('X-VillaCorz-Token', $token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('id', $user->id);
    }

    public function test_protected_route_accepts_prefixed_token_from_fallback_header(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('spa')->plainTextToken;

        $this->withHeader('X-VillaCorz-Token', 'Bearer '.$token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('id', $user->id);
    }

    public function test_invalid_fallback_token_is_rejected(): void
    {
        $this->withHeader('X-VillaCorz-Token', 'not-a-valid-token')
            ->getJson('/api/user')
            ->assertUnauthorized();
    }
}
