<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_hsts_is_sent_when_a_trusted_proxy_marks_the_request_as_https(): void
    {
        $this->withServerVariables([
            'REMOTE_ADDR' => '10.0.0.1',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ])->getJson('/api/services')
            ->assertOk()
            ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    public function test_hsts_is_not_sent_when_the_proxy_is_not_trusted(): void
    {
        $this->withServerVariables([
            'REMOTE_ADDR' => '203.0.113.10',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ])->getJson('/api/services')
            ->assertOk()
            ->assertHeaderMissing('Strict-Transport-Security');
    }
}
