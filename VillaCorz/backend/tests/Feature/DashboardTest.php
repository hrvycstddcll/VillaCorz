<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\PageView;
use App\Models\Payment;
use App\Models\Service;
use App\Models\User;
use App\Support\StayPolicy;
use App\Support\StayTime;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private function fakeSarimaxForecast(array $overrides = []): void
    {
        Http::fake([
            '*' => Http::response(array_replace([
                'model' => 'sarimax',
                'forecast' => [[
                    'date' => now()->addDay()->toDateString(),
                    'expected_bookings' => 0,
                    'expected_occupancy' => 0,
                    'factor' => 1,
                    'is_weekend' => false,
                    'holiday' => null,
                ]],
                'backtest' => null,
                'multipliers' => ['weekend' => 1.22, 'holiday' => 1.45],
            ], $overrides)),
        ]);
    }

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
        $paidDays = 2;
        $checkIn = StayTime::parseLocal(
            now()->subDays(3)->toDateString(),
            StayPolicy::defaultCheckInTime(),
        );
        $checkOut = StayPolicy::checkOutFor($checkIn, $paidDays);

        $booking = Booking::create([
            'user_id' => $user->id,
            'reference' => 'VC-DASH-' . uniqid(),
            'contact_name' => trim($user->firstname . ' ' . $user->lastname),
            'contact_email' => $user->email,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'paid_days' => $paidDays,
            'nights' => $paidDays,
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
        $this->fakeSarimaxForecast();
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
        $this->assertSame('sarimax', $data['demand_forecast']['model']);
    }

    public function test_dashboard_reflects_a_paid_booking_in_the_range(): void
    {
        $this->fakeSarimaxForecast();
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

    public function test_occupancy_forecast_uses_paid_stay_room_nights_and_returns_room_recommendations(): void
    {
        $forecast = array_map(
            fn (int $offset) => [
                'date' => now()->addDays($offset + 1)->toDateString(),
                'expected_bookings' => 2,
                'expected_occupancy' => 50,
                'factor' => 1,
                'is_weekend' => false,
                'holiday' => $offset < 4 ? 'Fixture holiday' : null,
            ],
            range(0, 59),
        );
        $this->fakeSarimaxForecast(['forecast' => $forecast]);
        $admin = $this->makeUser('admin');
        $customer = $this->makeUser('customer');
        $service = $this->makeService();
        $this->seedPaidBooking($customer, $service);

        $response = $this->actingAs($admin)
            ->getJson('/api/dashboard?forecast_preset=14')
            ->assertOk();

        $demandForecast = $response->json('data.demand_forecast');
        $this->assertSame('sarimax', $demandForecast['model']);
        $this->assertCount(14, $demandForecast['forecast']);
        $this->assertEquals(2.0, (float) $demandForecast['forecast'][0]['expected_room_nights']);
        $this->assertEquals(50.0, (float) $demandForecast['forecast'][0]['expected_occupancy']);
        $this->assertArrayNotHasKey('recommendations', $demandForecast);
        $this->assertArrayNotHasKey('suggested_price', $demandForecast);

        $recommendations = $response->json('data.room_recommendations');
        $this->assertCount(1, $recommendations);
        $this->assertSame('Seaview Room', $recommendations[0]['name']);
        $this->assertSame('increase', $recommendations[0]['direction']);
        $this->assertEquals(3000.0, (float) $recommendations[0]['suggested_price']);
        $this->assertEquals(20.0, (float) $recommendations[0]['change_percent']);
        $this->assertNotEmpty($recommendations[0]['reasons']);

        Http::assertSent(function ($request) {
            $history = $request->data()['history'] ?? [];

            return str_contains($request->url(), '/forecast')
                && collect($history)->contains(fn (array $point) => $point['bookings'] > 0);
        });
    }

    public function test_forecast_history_counts_paid_day_windows_by_pht_start_date(): void
    {
        $this->fakeSarimaxForecast();
        $admin = $this->makeUser('admin');
        $customer = $this->makeUser('customer');
        $service = $this->makeService();
        $paidDays = 2;
        $checkInDate = now()->subDays(3)->toDateString();
        $checkIn = StayTime::parseLocal($checkInDate, '01:00');
        $checkOut = StayPolicy::checkOutFor($checkIn, $paidDays);

        $booking = Booking::create([
            'user_id' => $customer->id,
            'reference' => 'VC-DASH-PHT-' . uniqid(),
            'contact_name' => trim($customer->firstname . ' ' . $customer->lastname),
            'contact_email' => $customer->email,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'paid_days' => $paidDays,
            'nights' => $paidDays,
            'adults' => 2,
            'kids' => 0,
            'subtotal' => 5000,
            'total' => 5000,
            'currency' => 'PHP',
            'status' => 'confirmed',
            'payment_method' => 'GCash',
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
            'line_total' => 5000,
        ]);

        Payment::create([
            'booking_id' => $booking->id,
            'reference' => 'PAY-' . $booking->reference,
            'provider' => 'demo',
            'method' => 'GCash',
            'amount' => 5000,
            'currency' => 'PHP',
            'status' => 'paid',
            'qr_token_hash' => hash('sha256', uniqid()),
            'qr_url' => 'http://localhost/pay/x',
            'paid_at' => now()->subDays(2),
        ]);

        $this->actingAs($admin)->getJson('/api/dashboard')->assertOk();

        Http::assertSent(function ($request) use ($checkInDate) {
            $history = collect($request->data()['history'] ?? [])->keyBy('date');
            $previousDate = Carbon::parse($checkInDate)->subDay()->toDateString();

            return str_contains($request->url(), '/forecast')
                && ($history[$checkInDate]['bookings'] ?? 0) === 1
                && ($history[$previousDate]['bookings'] ?? 0) === 0;
        });
    }

    public function test_dashboard_sends_as_of_date_and_passes_through_wape(): void
    {
        $this->fakeSarimaxForecast([
            'backtest' => [
                'window_days' => 3,
                'model' => 'sarimax',
                'mae' => 1.5,
                'mape' => 12.34,
                'wape' => 9.87,
                'points' => [[
                    'date' => now()->subDay()->toDateString(),
                    'actual_bookings' => 10,
                    'predicted_bookings' => 9,
                ]],
            ],
            'multipliers' => ['weekend' => 1.31, 'holiday' => 1.62],
        ]);

        $response = $this->actingAs($this->makeUser('admin'))
            ->getJson('/api/dashboard')
            ->assertOk();

        $accuracy = $response->json('data.demand_forecast.accuracy');
        $this->assertEquals(12.3, (float) $accuracy['mape']);
        $this->assertEquals(9.9, (float) $accuracy['wape']);
        $this->assertSame('sarimax', $accuracy['model']);
        $this->assertEquals(10.0, (float) $accuracy['points'][0]['actual_room_nights']);

        $factors = collect($response->json('data.demand_forecast.factors'))->keyBy('key');
        $this->assertStringContainsString('31%', $factors['weekends']['impact']);
        $this->assertStringContainsString('62%', $factors['holidays']['impact']);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/forecast')
                && $request->data()['as_of_date'] === now()->toDateString();
        });
    }

    public function test_dashboard_returns_more_than_five_recent_reservations_for_show_more(): void
    {
        $this->fakeSarimaxForecast();
        $admin = $this->makeUser('admin');
        $customer = $this->makeUser('customer');
        $service = $this->makeService();

        for ($index = 0; $index < 9; $index++) {
            $this->seedPaidBooking($customer, $service);
        }

        $response = $this->actingAs($admin)
            ->getJson('/api/dashboard')
            ->assertOk();

        $this->assertCount(9, $response->json('data.recent_bookings'));
    }

    public function test_dashboard_uses_fallback_when_forecasting_fails(): void
    {
        Http::fake(['*' => Http::response(['detail' => 'forecast failed'], 500)]);

        $response = $this->actingAs($this->makeUser('admin'))
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.demand_forecast.model', 'fallback');

        $this->assertNotEmpty($response->json('data.demand_forecast.forecast'));
    }

    public function test_dashboard_retries_forecast_when_service_is_waking_up(): void
    {
        Http::fake([
            '*' => Http::sequence()
                ->push(['detail' => 'service unavailable'], 503)
                ->push([
                    'model' => 'sarimax',
                    'forecast' => [[
                        'date' => now()->addDay()->toDateString(),
                        'expected_bookings' => 0,
                        'expected_occupancy' => 0,
                        'factor' => 1,
                        'is_weekend' => false,
                        'holiday' => null,
                    ]],
                    'backtest' => null,
                    'multipliers' => ['weekend' => 1.22, 'holiday' => 1.45],
                ]),
        ]);

        $response = $this->actingAs($this->makeUser('admin'))
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.demand_forecast.model', 'sarimax');

        Http::assertSentCount(2);
        $this->assertNotEmpty($response->json('data.demand_forecast.forecast'));
    }

    public function test_dashboard_uses_fallback_when_forecast_model_is_invalid(): void
    {
        $this->fakeSarimaxForecast(['model' => 'weekday_average']);

        $response = $this->actingAs($this->makeUser('admin'))
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.demand_forecast.model', 'fallback');

        $this->assertNotEmpty($response->json('data.demand_forecast.forecast'));
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
