<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_status_is_admin_only(): void
    {
        $this->getJson('/api/system/status')->assertUnauthorized();

        $customer = User::factory()->create(['role' => 'customer']);

        $this->withToken($customer->createToken('status')->plainTextToken)
            ->getJson('/api/system/status')
            ->assertForbidden();
    }

    public function test_admin_status_returns_only_configuration_booleans(): void
    {
        config()->set([
            'mail.default' => 'brevo',
            'mail.from.address' => 'noreply@example.com',
            'services.brevo.key' => 'mail-secret-should-not-leak',
            'services.cloudinary.cloud_name' => 'demo-cloud',
            'services.cloudinary.api_key' => 'cloud-key-should-not-leak',
            'services.cloudinary.api_secret' => 'cloud-secret-should-not-leak',
            'assistant.enabled' => true,
            'assistant.provider' => 'groq',
            'assistant.groq_key' => 'groq-secret-should-not-leak',
            'forecasting.url' => 'https://forecast.example.com/secret-path',
            'backup.driver' => 'database',
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        $response = $this->withToken($admin->createToken('status')->plainTextToken)
            ->getJson('/api/system/status')
            ->assertOk()
            ->assertExactJson([
                'success' => true,
                'data' => [
                    'mail' => true,
                    'cloudinary' => true,
                    'assistant' => true,
                    'forecast' => true,
                    'backup' => true,
                    'database' => true,
                ],
            ]);

        foreach ([
            'mail-secret-should-not-leak',
            'cloud-key-should-not-leak',
            'cloud-secret-should-not-leak',
            'groq-secret-should-not-leak',
            'secret-path',
        ] as $value) {
            $this->assertStringNotContainsString($value, (string) $response->getContent());
        }
    }

    public function test_missing_integrations_are_reported_as_false(): void
    {
        config()->set([
            'mail.default' => 'log',
            'services.brevo.key' => null,
            'services.cloudinary.cloud_name' => null,
            'services.cloudinary.api_key' => null,
            'services.cloudinary.api_secret' => null,
            'assistant.enabled' => false,
            'assistant.provider' => 'groq',
            'assistant.groq_key' => null,
            'forecasting.url' => '',
            'backup.driver' => '',
        ]);

        $admin = User::factory()->create(['role' => 'admin']);

        $this->withToken($admin->createToken('status')->plainTextToken)
            ->getJson('/api/system/status')
            ->assertOk()
            ->assertExactJson([
                'success' => true,
                'data' => [
                    'mail' => false,
                    'cloudinary' => false,
                    'assistant' => false,
                    'forecast' => false,
                    'backup' => false,
                    'database' => true,
                ],
            ]);
    }
}
