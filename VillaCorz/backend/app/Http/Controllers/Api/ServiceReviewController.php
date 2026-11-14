<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Service;
use App\Models\ServiceReview;
use App\Models\ServiceReviewImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ServiceReviewController extends Controller
{
    private const MAX_IMAGES = 5;

    public function index(int $serviceId): JsonResponse
    {
        $service = Service::findOrFail($serviceId);

        $reviews = ServiceReview::query()
            ->where('service_id', $service->id)
            ->where('status', 'published')
            ->with(['user', 'images', 'booking'])
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $reviews->getCollection()->map(
                fn (ServiceReview $review) => $this->reviewPayload($review)
            )->values(),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'total' => $reviews->total(),
                'average_rating' => round((float) ($service->reviews()->avg('rating') ?? 0), 1),
                'reviews_count' => $service->reviews()->count(),
            ],
        ]);
    }

    public function store(Request $request, int $serviceId): JsonResponse
    {
        $user = $request->user();
        $service = Service::findOrFail($serviceId);

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:120'],
            'comment' => ['nullable', 'string', 'max:2000'],
            'images' => ['nullable', 'array', 'max:' . self::MAX_IMAGES],
            'images.*' => ['image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ]);

        // Review eligibility: a completed stay for this service within 30 days.
        $completedBooking = Booking::query()
            ->where('user_id', $user->id)
            ->where('status', 'confirmed')
            ->whereDate('check_out', '<', now()->toDateString())
            ->whereHas('rooms', fn ($q) => $q->where('service_id', $service->id))
            ->orderByDesc('check_out')
            ->first();

        if (! $completedBooking) {
            throw ValidationException::withMessages([
                'service' => 'You can leave a review after completing a stay at this service.',
            ]);
        }

        if ($completedBooking->check_out->lt(now()->subDays(30))) {
            throw ValidationException::withMessages([
                'service' => 'The review window for this stay has closed (30 days).',
            ]);
        }

        $review = ServiceReview::updateOrCreate(
            ['user_id' => $user->id, 'service_id' => $service->id],
            [
                'booking_id' => $completedBooking->id,
                'rating' => $validated['rating'],
                'title' => $validated['title'] ?? null,
                'comment' => $validated['comment'] ?? null,
                'status' => 'published',
            ]
        );

        $this->storeImages($request, $review);

        $review->load(['user', 'images', 'booking']);

        return response()->json([
            'success' => true,
            'message' => 'Review saved.',
            'data' => $this->reviewPayload($review),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $review = ServiceReview::with(['user', 'images', 'booking', 'service'])->findOrFail($id);
        $user = $request->user();

        if ($review->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'rating' => ['sometimes', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:120'],
            'comment' => ['nullable', 'string', 'max:2000'],
            'images' => ['nullable', 'array', 'max:' . self::MAX_IMAGES],
            'images.*' => ['image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ]);

        // Apply provided fields directly.
        if (array_key_exists('rating', $validated)) {
            $review->rating = $validated['rating'];
        }
        if (array_key_exists('title', $validated)) {
            $review->title = $validated['title'];
        }
        if (array_key_exists('comment', $validated)) {
            $review->comment = $validated['comment'];
        }
        $review->save();

        if ($request->hasFile('images')) {
            $this->storeImages($request, $review);
        }

        $review->load(['user', 'images', 'booking']);

        return response()->json([
            'success' => true,
            'message' => 'Review updated.',
            'data' => $this->reviewPayload($review),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $review = ServiceReview::findOrFail($id);
        $user = $request->user();

        if ($review->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        foreach ($review->images as $image) {
            if ($image->public_id) {
                // Cloudinary not used for reviews; local disk only.
            }
            $path = str_replace('/storage/', '', (string) parse_url($image->image_url, PHP_URL_PATH));
            Storage::disk('public')->delete($path);
        }

        $review->delete();

        return response()->json([
            'success' => true,
            'message' => 'Review deleted.',
        ]);
    }

    public function setStatus(Request $request, int $id): JsonResponse
    {
        $review = ServiceReview::findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', 'in:published,pending,hidden'],
        ]);

        $review->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Review status updated.',
            'data' => $this->reviewPayload($review->fresh(['user', 'images', 'booking'])),
        ]);
    }

    public function canReview(Request $request, int $serviceId): JsonResponse
    {
        $user = $request->user();
        Service::findOrFail($serviceId);

        $completedBooking = Booking::query()
            ->where('user_id', $user->id)
            ->where('status', 'confirmed')
            ->whereDate('check_out', '<', now()->toDateString())
            ->whereHas('rooms', fn ($q) => $q->where('service_id', $serviceId))
            ->orderByDesc('check_out')
            ->first();

        $eligible = $completedBooking !== null
            && ! $completedBooking->check_out->lt(now()->subDays(30));

        return response()->json([
            'success' => true,
            'data' => [
                'eligible' => $eligible,
                'reason' => $eligible
                    ? null
                    : ($completedBooking === null
                        ? 'Complete a stay at this service to leave a review.'
                        : 'The review window for this stay has closed (30 days).'),
            ],
        ]);
    }

    private function storeImages(Request $request, ServiceReview $review): void
    {
        $files = $request->file('images', []);
        if (! is_array($files)) {
            $files = [$files];
        }
        $files = array_values(array_filter($files));

        if ($files === []) {
            return;
        }

        $existingCount = $review->images()->count();
        if ($existingCount + count($files) > self::MAX_IMAGES) {
            throw ValidationException::withMessages([
                'images' => 'A review can have at most ' . self::MAX_IMAGES . ' images.',
            ]);
        }

        foreach ($files as $index => $file) {
            $path = $file->store('reviews', 'public');
            $review->images()->create([
                'image_url' => Storage::disk('public')->url($path),
                'public_id' => null,
                'sort_order' => $existingCount + $index,
            ]);
        }
    }

    private function reviewPayload(ServiceReview $review): array
    {
        return [
            'id' => $review->id,
            'service_id' => $review->service_id,
            'rating' => $review->rating,
            'title' => $review->title,
            'comment' => $review->comment,
            'status' => $review->status,
            'verified' => $review->isVerified(),
            'author' => $review->user ? trim($review->user->firstname . ' ' . $review->user->lastname) : 'Guest',
            'created_at' => $review->created_at?->toIso8601String(),
            'images' => $review->images->map(fn ($img) => [
                'id' => $img->id,
                'url' => $img->image_url,
                'sort_order' => $img->sort_order,
            ])->values(),
        ];
    }
}
