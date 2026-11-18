<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\Payment;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdminAssistantTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role): User
    {
        return User::create([
            'firstname' => ucfirst($role),
            'lastname' => 'User',
            'email' => $role.'-'.uniqid().'@example.com',
            'password' => 'password',
            'role' => $role,
        ]);
    }

    private function seedData(User $user): void
    {
        $service = Service::create([
            'created_by' => $user->id,
            'name' => 'Seaview Room',
            'description' => 'A room with a view.',
            'price' => 2500,
            'status' => 'active',
            'kind' => 'room',
        ]);

        $booking = Booking::create([
            'user_id' => $user->id,
            'reference' => 'VC-AI-'.uniqid(),
            'contact_name' => 'Private Guest',
            'contact_email' => 'private-guest-'.uniqid().'@example.com',
            'check_in' => now()->subDays(3)->startOfDay(),
            'check_out' => now()->subDay()->startOfDay(),
            'nights' => 2,
            'adults' => 2,
            'kids' => 0,
            'subtotal' => 5000,
            'total' => 5000,
            'currency' => 'PHP',
            'status' => 'confirmed',
            'payment_method' => 'GCash',
            'confirmed_at' => now()->subDays(5),
        ]);

        BookingRoom::create([
            'booking_id' => $booking->id,
            'service_id' => $service->id,
            'service_name' => $service->name,
            'kind' => $service->kind,
            'adults' => 2,
            'kids' => 0,
            'weekday_price' => $service->price,
            'weekend_price' => $service->price,
            'line_total' => 5000,
        ]);

        Payment::create([
            'booking_id' => $booking->id,
            'reference' => 'PAY-'.$booking->reference,
            'provider' => 'demo',
            'method' => 'GCash',
            'amount' => 5000,
            'currency' => 'PHP',
            'status' => 'paid',
            'idempotency_key' => 'ai-demo-'.$booking->id,
            'qr_token_hash' => hash('sha256', uniqid()),
            'qr_url' => 'http://localhost/pay/x',
            'qr_expires_at' => now()->addHour(),
            'paid_at' => now()->subDays(2),
        ]);
    }

    private function fakeChat(): void
    {
        Http::fake([
            '*/api/chat' => Http::response([
                'model' => 'qwen2.5:3b-instruct',
                'message' => [
                    'role' => 'assistant',
                    'content' => "Revenue rose in the selected window.\nVerify figures in Reports before acting.",
                ],
                'done' => true,
            ]),
        ]);
    }

    public function test_guests_and_customers_cannot_use_the_assistant(): void
    {
        config()->set('assistant.enabled', true);

        $this->postJson('/api/assistant/chat', [
            'message' => 'What happened?',
        ])->assertUnauthorized();

        $customer = $this->makeUser('customer');

        $this->actingAs($customer)
            ->postJson('/api/assistant/chat', [
                'message' => 'What happened?',
            ])
            ->assertForbidden();
    }

    public function test_admin_can_ask_a_grounded_question(): void
    {
        config()->set('assistant.enabled', true);
        $admin = $this->makeUser('admin');
        $this->seedData($admin);
        $this->fakeChat();

        $response = $this->actingAs($admin)->postJson('/api/assistant/chat', [
            'message' => 'What happened with revenue?',
            'context' => [
                'page' => 'reports',
                'report' => 'revenue',
                'range' => 30,
            ],
            'history' => [
                ['role' => 'user', 'content' => 'Hello'],
                ['role' => 'assistant', 'content' => 'Hi'],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.sources.page', 'reports')
            ->assertJsonPath('data.sources.report', 'revenue')
            ->assertJsonPath('data.sources.window.days', 30)
            ->assertJsonPath('data.answer', "Revenue rose in the selected window.\nVerify figures in Reports before acting.");

        Http::assertSent(function (HttpRequest $request) {
            $body = $request->data();
            $encoded = json_encode($body);
            $system = $body['messages'][0]['content'] ?? '';
            $last = end($body['messages']);

            return str_contains($system, 'HARD RULES')
                && str_contains($system, '"revenue"')
                && str_contains($system, 'Seaview Room')
                && str_contains($last['content'], '<user_question>')
                && ! str_contains((string) $encoded, 'private-guest')
                && ! str_contains((string) $encoded, 'VC-AI-');
        });
    }

    public function test_disabled_assistant_returns_service_unavailable(): void
    {
        config()->set('assistant.enabled', false);
        $admin = $this->makeUser('admin');

        $this->actingAs($admin)
            ->postJson('/api/assistant/chat', ['message' => 'What happened?'])
            ->assertStatus(503);
    }

    public function test_ollama_failure_returns_bad_gateway(): void
    {
        config()->set('assistant.enabled', true);
        $admin = $this->makeUser('admin');
        Http::fake([
            '*/api/chat' => Http::response(['error' => 'unavailable'], 500),
        ]);

        $this->actingAs($admin)
            ->postJson('/api/assistant/chat', ['message' => 'What happened?'])
            ->assertStatus(502)
            ->assertJsonPath('success', false);
    }

    public function test_status_reports_model_availability(): void
    {
        config()->set('assistant.enabled', true);
        $admin = $this->makeUser('admin');
        Http::fake([
            '*/api/tags' => Http::response(['models' => []]),
        ]);

        $this->actingAs($admin)
            ->getJson('/api/assistant/status')
            ->assertOk()
            ->assertJsonPath('data.reachable', true)
            ->assertJsonPath('data.model', 'qwen2.5:3b-instruct');
    }
}
