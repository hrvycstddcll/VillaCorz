<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\Service;
use App\Models\ServiceReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ServiceReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_review_a_service_after_a_recent_completed_stay(): void
    {
        $customer = $this->makeUser('customer');
        $service = $this->makeRoom();
        $booking = $this->completedStay($customer, $service, now()->subDays(5));

        $this->actingAs($customer)
            ->getJson("/api/services/{$service->id}/can-review")
            ->assertOk()
            ->assertJsonPath('data.eligible', true)
            ->assertJsonPath('data.reason', null);

        $this->actingAs($customer)
            ->postJson("/api/services/{$service->id}/reviews", [
                'rating' => 4,
                'title' => 'Great stay',
                'comment' => 'Would book again.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.rating', 4)
            ->assertJsonPath('data.user_id', $customer->id)
            ->assertJsonPath('data.author', 'Customer User');

        $this->assertDatabaseHas('service_reviews', [
            'service_id' => $service->id,
            'user_id' => $customer->id,
            'booking_id' => $booking->id,
            'rating' => 4,
        ]);
    }

    public function test_customer_cannot_review_without_a_completed_stay(): void
    {
        $customer = $this->makeUser('customer');
        $service = $this->makeRoom();

        $this->completedStay($customer, $service, now()->addDays(3), 'confirmed');

        $this->actingAs($customer)
            ->getJson("/api/services/{$service->id}/can-review")
            ->assertOk()
            ->assertJsonPath('data.eligible', false);

        $this->actingAs($customer)
            ->postJson("/api/services/{$service->id}/reviews", [
                'rating' => 5,
                'comment' => 'Too early.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('service');

        $this->assertDatabaseCount('service_reviews', 0);
    }

    public function test_review_window_closes_thirty_days_after_check_out(): void
    {
        $customer = $this->makeUser('customer');
        $service = $this->makeRoom();
        $this->completedStay($customer, $service, now()->subDays(40));

        $this->actingAs($customer)
            ->getJson("/api/services/{$service->id}/can-review")
            ->assertOk()
            ->assertJsonPath('data.eligible', false);

        $this->actingAs($customer)
            ->postJson("/api/services/{$service->id}/reviews", [
                'rating' => 5,
                'comment' => 'Late review.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('service');
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

    private function makeRoom(): Service
    {
        return Service::create([
            'kind' => 'room',
            'name' => 'Room ' . uniqid(),
            'description' => 'A demo room.',
            'price' => 1500,
            'status' => 'active',
        ]);
    }

    private function completedStay(
        User $customer,
        Service $service,
        Carbon $checkOut,
        string $status = 'confirmed',
    ): Booking {
        $booking = Booking::create([
            'user_id' => $customer->id,
            'reference' => 'VC-TEST-' . strtoupper(uniqid()),
            'contact_name' => trim($customer->firstname . ' ' . $customer->lastname),
            'contact_email' => $customer->email,
            'check_in' => $checkOut->copy()->subDays(2),
            'check_out' => $checkOut,
            'nights' => 2,
            'adults' => 1,
            'kids' => 0,
            'subtotal' => 3000,
            'total' => 3000,
            'currency' => 'PHP',
            'status' => $status,
            'payment_method' => 'GCash',
            'confirmed_at' => now()->subDays(10),
        ]);

        BookingRoom::create([
            'booking_id' => $booking->id,
            'service_id' => $service->id,
            'service_name' => $service->name,
            'kind' => $service->kind,
            'adults' => 1,
            'kids' => 0,
            'weekday_price' => $service->price,
            'weekend_price' => $service->price,
            'line_total' => 3000,
        ]);

        return $booking;
    }
}
