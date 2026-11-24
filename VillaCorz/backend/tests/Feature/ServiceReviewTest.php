<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingRoom;
use App\Models\Service;
use App\Models\ServiceReview;
use App\Models\ServiceReviewImage;
use App\Models\User;
use App\Services\CloudinaryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Tests\UsesSqliteInMemory;

class ServiceReviewTest extends TestCase
{
    use RefreshDatabase;
    use UsesSqliteInMemory;

    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

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

    public function test_review_images_are_uploaded_to_cloudinary(): void
    {
        $customer = $this->makeUser('customer');
        $service = $this->makeRoom();
        $this->completedStay($customer, $service, now()->subDays(5));

        Storage::fake('public');

        $cloudinary = $this->mock(CloudinaryService::class);
        $cloudinary->shouldReceive('isConfigured')->once()->andReturn(true);
        $cloudinary->shouldReceive('upload')
            ->once()
            ->with(\Mockery::type(UploadedFile::class), 'villacorz/reviews')
            ->andReturn([
                'url' => 'https://res.cloudinary.com/demo/image/upload/villacorz/reviews/review.png',
                'public_id' => 'villacorz/reviews/review',
            ]);

        $this->actingAs($customer)
            ->post('/api/services/'.$service->id.'/reviews', [
                'rating' => 5,
                'comment' => 'Lovely stay.',
                'images' => [$this->fakePng('review.png')],
            ])
            ->assertCreated()
            ->assertJsonPath(
                'data.images.0.url',
                'https://res.cloudinary.com/demo/image/upload/villacorz/reviews/review.png',
            )
            ->assertJsonPath('data.images.0.sort_order', 0);

        $this->assertDatabaseHas('service_review_images', [
            'image_url' => 'https://res.cloudinary.com/demo/image/upload/villacorz/reviews/review.png',
            'public_id' => 'villacorz/reviews/review',
            'sort_order' => 0,
        ]);

        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_review_image_upload_reports_missing_cloudinary_configuration(): void
    {
        $customer = $this->makeUser('customer');
        $service = $this->makeRoom();
        $this->completedStay($customer, $service, now()->subDays(5));

        $cloudinary = $this->mock(CloudinaryService::class);
        $cloudinary->shouldReceive('isConfigured')->once()->andReturn(false);

        $this->actingAs($customer)
            ->post('/api/services/'.$service->id.'/reviews', [
                'rating' => 5,
                'comment' => 'Lovely stay.',
                'images' => [$this->fakePng('review.png')],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Cloudinary image uploads are not configured. Add the Cloudinary credentials to the backend environment.');

        $this->assertDatabaseCount('service_review_images', 0);
    }

    public function test_review_update_replaces_images_and_deletes_old_cloudinary_assets(): void
    {
        $customer = $this->makeUser('customer');
        $service = $this->makeRoom();
        $booking = $this->completedStay($customer, $service, now()->subDays(5));

        $review = ServiceReview::create([
            'service_id' => $service->id,
            'user_id' => $customer->id,
            'booking_id' => $booking->id,
            'rating' => 4,
            'status' => 'published',
        ]);

        $oldImage = ServiceReviewImage::create([
            'service_review_id' => $review->id,
            'image_url' => 'https://res.cloudinary.com/demo/image/upload/villacorz/reviews/old.png',
            'public_id' => 'villacorz/reviews/old',
            'sort_order' => 0,
        ]);

        $cloudinary = $this->mock(CloudinaryService::class);
        $cloudinary->shouldReceive('isConfigured')->once()->andReturn(true);
        $cloudinary->shouldReceive('upload')
            ->once()
            ->with(\Mockery::type(UploadedFile::class), 'villacorz/reviews')
            ->andReturn([
                'url' => 'https://res.cloudinary.com/demo/image/upload/villacorz/reviews/new.png',
                'public_id' => 'villacorz/reviews/new',
            ]);
        $cloudinary->shouldReceive('destroy')->once()->with('villacorz/reviews/old');

        $this->actingAs($customer)
            ->put("/api/reviews/{$review->id}", [
                'rating' => 5,
                'removed_image_ids' => [$oldImage->id],
                'images' => [$this->fakePng('new.png')],
            ])
            ->assertOk()
            ->assertJsonPath('data.images.0.url', 'https://res.cloudinary.com/demo/image/upload/villacorz/reviews/new.png')
            ->assertJsonPath('data.images.0.sort_order', 0);

        $this->assertDatabaseMissing('service_review_images', ['id' => $oldImage->id]);
        $this->assertDatabaseHas('service_review_images', [
            'service_review_id' => $review->id,
            'public_id' => 'villacorz/reviews/new',
        ]);
    }

    public function test_deleting_a_review_deletes_its_cloudinary_images(): void
    {
        $customer = $this->makeUser('customer');
        $service = $this->makeRoom();
        $booking = $this->completedStay($customer, $service, now()->subDays(5));

        $review = ServiceReview::create([
            'service_id' => $service->id,
            'user_id' => $customer->id,
            'booking_id' => $booking->id,
            'rating' => 4,
            'status' => 'published',
        ]);

        ServiceReviewImage::create([
            'service_review_id' => $review->id,
            'image_url' => 'https://res.cloudinary.com/demo/image/upload/villacorz/reviews/old.png',
            'public_id' => 'villacorz/reviews/old',
            'sort_order' => 0,
        ]);

        $cloudinary = $this->mock(CloudinaryService::class);
        $cloudinary->shouldReceive('destroy')->once()->with('villacorz/reviews/old');

        $this->actingAs($customer)
            ->deleteJson("/api/reviews/{$review->id}")
            ->assertOk();

        $this->assertDatabaseMissing('service_reviews', ['id' => $review->id]);
        $this->assertDatabaseMissing('service_review_images', ['service_review_id' => $review->id]);
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
            'paid_days' => 2,
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

    private function fakePng(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode(self::PNG),
        );
    }
}
