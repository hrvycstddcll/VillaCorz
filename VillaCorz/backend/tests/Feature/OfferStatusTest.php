<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfferStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_offer_status_without_resending_offer(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $service = Service::create([
            'created_by' => $admin->id,
            'name' => 'Garden Suite',
            'description' => 'A quiet suite.',
            'price' => 3000,
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/services/{$service->id}/status", ['status' => 'inactive'])
            ->assertOk()
            ->assertJsonPath('data.status', 'inactive');

        $this->assertDatabaseHas('services', [
            'id' => $service->id,
            'status' => 'inactive',
        ]);
    }

    public function test_admin_can_read_offer_metrics(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->getJson('/api/admin/offers?range=30')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_customers_cannot_update_offer_status(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $service = Service::create([
            'created_by' => $customer->id,
            'name' => 'Garden Suite',
            'description' => 'A quiet suite.',
            'price' => 3000,
            'status' => 'active',
        ]);

        $this->actingAs($customer)
            ->patchJson("/api/services/{$service->id}/status", ['status' => 'inactive'])
            ->assertForbidden();
    }
}
