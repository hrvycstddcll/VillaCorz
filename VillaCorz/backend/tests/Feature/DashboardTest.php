<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\PageView;
use App\Models\Payment;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role): User
    {
        return User::create([
            'firstname' => ucfirst($role),
            'lastname' => 'User',
            'email' => $role . '-' . uniqid() . '@example.com',
            'password' => 'password',
            'role' => $role,
        ]);
    }

    private function makeService(): Service
    {
        $admin = $this->makeUser('admin');

        return Service::create([
            'created_by' => $admin->id,
            'name' => 'Seaview Room',
            'description' => 'A room with a view.',
            'price' => 2500,
            'status' => 'active',
            'kind' => 'room',
        ]);
    }

    private function seedPaidBooking(User $user, Service $service): Booking
    {
        $checkIn = now()->subDays(3)->startOfDay();
        $checkOut = $checkIn->copy()->addDays(2);

        $booking = Booking::create([
            'user_id' => $user->id,
            'reference' => 'VC-DASH-' . uniqid(),
            'contact_name' => trim($user->firstname . ' ' . $user->lastname),
            'contact_email' => $user->email,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'nights' => 2,
            'adults' => 2,
            'kids' => 0,
            'subtotal' => (float) $service->price * 2,
            'total' => (float) $service->price * 2,
            'currency' => 'PHP',
            'status' => 'confirmed',
            'payment_method' => 'GCash',
            'confirmed_at' => $checkIn->copy()->subDays(10),
            'completed_at' => null,
        ]);

        BookingRoom::create([
            'booking_id' => $booking->id,
            'service_id' => $service->id,
            'service_name' => $service->name,
            'kind' => $service->kind,
            'adults' => 2,
            'kids' => 0,
            'weekday_price' => $service->price,
            'weekend_price' => $service->weekend_price ?? $service->price,
            'line_total' => (float) $service->price * 2,
        ]);

        Payment::create([
            'booking_id' => $booking->id,
            'reference' => 'PAY-' . $booking->reference,
            'provider' => 'demo',
            'method' => 'GCash',
            'amount' => (float) $service->price * 2,
            'currency' => 'PHP',
            'status' => 'paid',
            'idempotency_key' => 'demo-' . strtolower($booking->reference),
            'qr_token_hash' => hash('sha256', uniqid()),
            'qr_url' => 'http://localhost/pay/x',
            'qr_expires_at' => now()->addHour(),
            'paid_at' => now()->subDays(2),
        ]);

        return $booking;
    }

    public function test_guests_and_customers_cannot_read_the_dashboard(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();

        $customer = $this->makeUser('customer');
        $this->actingAs($customer)->getJson('/api/dashboard')->assertForbidden();
    }

    public function test_admin_gets_dashboard_summary_with_expected_shape(): void
    {
        $admin = $this->makeUser('admin');

        $response = $this->actingAs($admin)
            ->getJson('/api/dashboard?range=7')
            ->assertOk()
            ->assertJsonPath('success', true);

        $data = $response->json('data');
        $this->assertSame(7, $data['range']);
        $this->assertArrayHasKey('revenue', $data['metrics']);
        $this->assertArrayHasKey('check_ins', $data['metrics']);
        $this->assertArrayHasKey('new_bookings', $data['metrics']);
        $this->assertArrayHasKey('new_users', $data['metrics']);
        $this->assertArrayHasKey('website_visits', $data['metrics']);
        $this->assertCount(7, $data['series']);
        $this->assertIsArray($data['recent_bookings']);
        $this->assertArrayHasKey('pending_cancellations', $data['action_center']);
        $this->assertArrayHasKey('contact_messages', $data['action_center']);
        $this->assertArrayHasKey('occupancy', $data['operational']);
        $this->assertCount(7, $data['revenue_by_weekday']);
    }

    public function test_dashboard_reflects_a_paid_booking_in_the_range(): void
    {
        $admin = $this->makeUser('admin');
        $customer = $this->makeUser('customer');
        $service = $this->makeService();

        $booking = $this->seedPaidBooking($customer, $service);

        $response = $this->actingAs($admin)
            ->getJson('/api/dashboard?range=30')
            ->assertOk();

        $metrics = $response->json('data.metrics');
        $this->assertGreaterThanOrEqual(1, $metrics['new_bookings']);
        $this->assertGreaterThanOrEqual(1, $metrics['new_users']);
        $this->assertGreaterThan(0, $metrics['revenue']);

        $references = collect($response->json('data.recent_bookings'))->pluck('reference');
        $this->assertTrue($references->contains($booking->reference));
    }

    public function test_page_view_tracking_records_a_row(): void
    {
        $this->postJson('/api/page-views', ['path' => '/services'])
            ->assertStatus(201);

        $this->assertDatabaseHas('page_views', ['path' => '/services']);
        $this->assertSame(1, PageView::count());
    }

    public function test_page_view_tracking_validates_path(): void
    {
        $this->postJson('/api/page-views', [])
            ->assertStatus(422);
    }
}
