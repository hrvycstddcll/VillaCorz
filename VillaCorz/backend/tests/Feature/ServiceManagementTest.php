<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\ServiceImage;
use App\Models\User;
use App\Services\CloudinaryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ServiceManagementTest extends TestCase
{
    use RefreshDatabase;

    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    public function test_guests_and_customers_cannot_manage_services(): void
    {
        $payload = [
            'name' => 'Private Chef',
            'description' => 'A chef for the evening.',
            'price' => 2500,
            'status' => 'active',
        ];

        $this->postJson('/api/services', $payload)->assertUnauthorized();

        $customer = $this->makeUser('customer');

        $this->actingAs($customer)
            ->postJson('/api/services', $payload)
            ->assertForbidden();

        $service = Service::create([
            'created_by' => $customer->id,
            ...$payload,
        ]);

        $this->actingAs($customer)
            ->putJson("/api/services/{$service->id}", $payload)
            ->assertForbidden();

        $this->actingAs($customer)
            ->deleteJson("/api/services/{$service->id}")
            ->assertForbidden();
    }

    public function test_services_are_publicly_listed(): void
    {
        $admin = $this->makeUser('admin');

        Service::create([
            'created_by' => $admin->id,
            'name' => 'Island Tour',
            'description' => 'A guided tour.',
            'price' => 1500,
            'status' => 'active',
        ]);

        $this->getJson('/api/services')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.name', 'Island Tour');
    }

    public function test_admin_can_create_a_service_without_images(): void
    {
        $admin = $this->makeUser('admin');

        $response = $this->actingAs($admin)->postJson('/api/services', [
            'name' => 'Sunset Cruise',
            'description' => 'An evening boat ride.',
            'price' => 3200,
            'status' => 'active',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Sunset Cruise')
            ->assertJsonPath('data.images', []);

        $this->assertDatabaseHas('services', [
            'name' => 'Sunset Cruise',
            'created_by' => $admin->id,
        ]);
    }

    public function test_admin_can_create_a_service_with_day_discounts(): void
    {
        $admin = $this->makeUser('admin');

        $response = $this->actingAs($admin)->postJson('/api/services', [
            'name' => 'Weekday Escape',
            'description' => 'A midweek stay with a discount.',
            'price' => 2000,
            'status' => 'active',
            'weekday_discount_type' => 'percent',
            'weekday_discount_value' => 20,
            'weekend_discount_type' => 'fixed',
            'weekend_discount_value' => 300,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.weekday_discount_type', 'percent')
            ->assertJsonPath('data.weekday_discount_value', '20.00')
            ->assertJsonPath('data.weekend_discount_type', 'fixed')
            ->assertJsonPath('data.weekend_discount_value', '300.00');

        $this->assertDatabaseHas('services', [
            'name' => 'Weekday Escape',
            'weekday_discount_type' => 'percent',
            'weekday_discount_value' => 20,
            'weekend_discount_type' => 'fixed',
            'weekend_discount_value' => 300,
        ]);
    }

    public function test_admin_can_update_one_day_discount_and_clear_the_other(): void
    {
        $admin = $this->makeUser('admin');

        $service = Service::create([
            'created_by' => $admin->id,
            'name' => 'Long Weekend',
            'description' => 'A discounted weekend stay.',
            'price' => 5000,
            'status' => 'active',
            'weekday_discount_type' => 'percent',
            'weekday_discount_value' => 15,
            'weekend_discount_type' => 'percent',
            'weekend_discount_value' => 10,
        ]);

        $this->actingAs($admin)
            ->putJson("/api/services/{$service->id}", [
                'name' => 'Long Weekend',
                'description' => 'A discounted weekend stay.',
                'price' => 5000,
                'status' => 'active',
                'weekday_discount_type' => 'fixed',
                'weekday_discount_value' => 500,
                'weekend_discount_type' => 'percent',
                'weekend_discount_value' => 10,
            ])
            ->assertOk()
            ->assertJsonPath('data.weekday_discount_type', 'fixed')
            ->assertJsonPath('data.weekday_discount_value', '500.00')
            ->assertJsonPath('data.weekend_discount_type', 'percent')
            ->assertJsonPath('data.weekend_discount_value', '10.00');

        $this->actingAs($admin)
            ->putJson("/api/services/{$service->id}", [
                'name' => 'Long Weekend',
                'description' => 'A discounted weekend stay.',
                'price' => 5000,
                'status' => 'active',
                'weekday_discount_type' => 'fixed',
                'weekday_discount_value' => 500,
                'weekend_discount_type' => '',
                'weekend_discount_value' => '',
            ])
            ->assertOk()
            ->assertJsonPath('data.weekday_discount_type', 'fixed')
            ->assertJsonPath('data.weekday_discount_value', '500.00')
            ->assertJsonPath('data.weekend_discount_type', null)
            ->assertJsonPath('data.weekend_discount_value', null);

        $this->assertDatabaseHas('services', [
            'id' => $service->id,
            'weekday_discount_type' => 'fixed',
            'weekday_discount_value' => 500,
            'weekend_discount_type' => null,
            'weekend_discount_value' => null,
        ]);
    }

    public function test_day_discount_validation_rejects_invalid_values(): void
    {
        $admin = $this->makeUser('admin');

        $this->actingAs($admin)
            ->postJson('/api/services', [
                'name' => 'Too Much Off',
                'price' => 2000,
                'status' => 'active',
                'weekday_discount_type' => 'percent',
                'weekday_discount_value' => 150,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('weekday_discount_value');

        $this->actingAs($admin)
            ->postJson('/api/services', [
                'name' => 'Over The Price',
                'price' => 1000,
                'status' => 'active',
                'weekend_discount_type' => 'fixed',
                'weekend_discount_value' => 1500,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('weekend_discount_value');
    }

    public function test_admin_can_create_a_service_with_ordered_images_and_primary(): void
    {
        $admin = $this->makeUser('admin');
        $cloudinary = $this->mock(CloudinaryService::class);

        $cloudinary->shouldReceive('isConfigured')->once()->andReturn(true);
        $cloudinary->shouldReceive('upload')
            ->twice()
            ->andReturn(
                [
                    'url' => 'https://res.cloudinary.com/demo/image/upload/first.png',
                    'public_id' => 'villacorz/services/first',
                ],
                [
                    'url' => 'https://res.cloudinary.com/demo/image/upload/second.png',
                    'public_id' => 'villacorz/services/second',
                ],
            );

        $response = $this->actingAs($admin)->post('/api/services', [
            'name' => 'Coastal Picnic',
            'description' => 'A picnic by the shore.',
            'price' => 1800,
            'status' => 'active',
            'images' => [
                $this->fakePng('first.png'),
                $this->fakePng('second.png'),
            ],
            'image_order' => ['new:1', 'new:0'],
            'primary_image' => 'new:1',
            'image_order_present' => '1',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('service_images', [
            'public_id' => 'villacorz/services/second',
            'is_primary' => 1,
            'sort_order' => 0,
        ]);

        $this->assertDatabaseHas('service_images', [
            'public_id' => 'villacorz/services/first',
            'is_primary' => 0,
            'sort_order' => 1,
        ]);
    }

    public function test_update_removes_unused_images_and_cleans_them_up_in_cloudinary(): void
    {
        $admin = $this->makeUser('admin');
        $service = Service::create([
            'created_by' => $admin->id,
            'name' => 'Spa Day',
            'description' => 'Relaxing treatments.',
            'price' => 2200,
            'status' => 'active',
        ]);

        $kept = ServiceImage::create([
            'service_id' => $service->id,
            'image_url' => 'https://res.cloudinary.com/demo/image/upload/kept.png',
            'public_id' => 'villacorz/services/kept',
            'is_primary' => true,
            'sort_order' => 0,
        ]);

        $removed = ServiceImage::create([
            'service_id' => $service->id,
            'image_url' => 'https://res.cloudinary.com/demo/image/upload/removed.png',
            'public_id' => 'villacorz/services/removed',
            'is_primary' => false,
            'sort_order' => 1,
        ]);

        $cloudinary = $this->mock(CloudinaryService::class);
        $cloudinary->shouldReceive('destroy')
            ->once()
            ->with('villacorz/services/removed');

        $response = $this->actingAs($admin)->putJson(
            "/api/services/{$service->id}",
            [
                'name' => 'Spa Afternoon',
                'description' => 'Updated treatments.',
                'price' => 2400,
                'status' => 'inactive',
                'image_order' => ["existing:{$kept->id}"],
                'primary_image' => "existing:{$kept->id}",
                'image_order_present' => '1',
            ],
        );

        $response
            ->assertOk()
            ->assertJsonPath('data.name', 'Spa Afternoon')
            ->assertJsonPath('data.status', 'inactive');

        $this->assertDatabaseMissing('service_images', ['id' => $removed->id]);

        $this->assertDatabaseHas('service_images', [
            'id' => $kept->id,
            'is_primary' => 1,
            'sort_order' => 0,
        ]);
    }

    public function test_deleting_a_service_removes_its_cloudinary_images(): void
    {
        $admin = $this->makeUser('admin');
        $service = Service::create([
            'created_by' => $admin->id,
            'name' => 'Beach Dinner',
            'description' => 'Dinner on the sand.',
            'price' => 4500,
            'status' => 'active',
        ]);

        ServiceImage::create([
            'service_id' => $service->id,
            'image_url' => 'https://res.cloudinary.com/demo/image/upload/dinner.png',
            'public_id' => 'villacorz/services/dinner',
            'is_primary' => true,
            'sort_order' => 0,
        ]);

        $cloudinary = $this->mock(CloudinaryService::class);
        $cloudinary->shouldReceive('destroy')
            ->once()
            ->with('villacorz/services/dinner');

        $this->actingAs($admin)
            ->deleteJson("/api/services/{$service->id}")
            ->assertOk();

        $this->assertDatabaseMissing('services', ['id' => $service->id]);
        $this->assertDatabaseMissing('service_images', ['service_id' => $service->id]);
    }

    public function test_image_upload_returns_a_clear_error_when_cloudinary_is_not_configured(): void
    {
        $admin = $this->makeUser('admin');
        $cloudinary = $this->mock(CloudinaryService::class);

        $cloudinary->shouldReceive('isConfigured')->once()->andReturn(false);

        $response = $this->actingAs($admin)->post('/api/services', [
            'name' => 'Photo Shoot',
            'price' => 1000,
            'status' => 'active',
            'images' => [$this->fakePng('photo.png')],
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonPath('success', false);

        $this->assertDatabaseMissing('services', ['name' => 'Photo Shoot']);
    }

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

    private function fakePng(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode(self::PNG),
        );
    }
}
