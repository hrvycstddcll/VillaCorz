<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Service;
use App\Models\ServiceReview;
use App\Models\ServiceReviewImage;
use App\Services\CloudinaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class ServiceReviewController extends Controller
{
    private const MAX_IMAGES = 5;

    private const CLOUDINARY_FOLDER = 'villacorz/reviews';

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

    public function store(Request $request, int $serviceId, CloudinaryService $cloudinary): JsonResponse
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
            ->where('check_out', '<', now())
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

        $files = $this->uploadedImages($request);
        $existingCount = ServiceReview::query()
            ->where('user_id', $user->id)
            ->where('service_id', $service->id)
            ->withCount('images')
            ->first()?->images_count ?? 0;

        $this->assertImageCapacity($existingCount, count($files));

        $uploaded = [];
        if ($files !== []) {
            if (! $cloudinary->isConfigured()) {
                return $this->imageConfigurationError();
            }

            try {
                $uploaded = $this->uploadImages($cloudinary, $files);
            } catch (RuntimeException $exception) {
                return response()->json([
                    'success' => false,
                    'message' => $exception->getMessage(),
                ], 422);
            }
        }

        try {
            $review = DB::transaction(function () use ($user, $service, $completedBooking, $validated, $uploaded) {
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

                $this->persistImages($review, $uploaded);

                return $review;
            });
        } catch (Throwable $exception) {
            $this->destroyUploaded($cloudinary, $uploaded);

            throw $exception;
        }

        $review->load(['user', 'images', 'booking']);

        return response()->json([
            'success' => true,
            'message' => 'Review saved.',
            'data' => $this->reviewPayload($review),
        ], 201);
    }

    public function update(Request $request, int $id, CloudinaryService $cloudinary): JsonResponse
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
            'removed_image_ids' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            'removed_image_ids.*' => ['integer'],
        ]);

        $files = $this->uploadedImages($request);
        $removedIds = array_values(array_unique(array_map(
            fn (mixed $value): int => (int) $value,
            $validated['removed_image_ids'] ?? [],
        )));

        $removedImages = $review->images()->whereIn('id', $removedIds)->get();

        if ($removedImages->count() !== count($removedIds)) {
            throw ValidationException::withMessages([
                'removed_image_ids' => 'One or more images do not belong to this review.',
            ]);
        }

        $this->assertImageCapacity(
            $review->images()->count() - $removedImages->count(),
            count($files),
        );

        $uploaded = [];
        if ($files !== []) {
            if (! $cloudinary->isConfigured()) {
                return $this->imageConfigurationError();
            }

            try {
                $uploaded = $this->uploadImages($cloudinary, $files);
            } catch (RuntimeException $exception) {
                return response()->json([
                    'success' => false,
                    'message' => $exception->getMessage(),
                ], 422);
            }
        }

        $removedPublicIds = $removedImages
            ->pluck('public_id')
            ->filter()
            ->unique()
            ->values()
            ->all();

        try {
            DB::transaction(function () use ($review, $validated, $removedImages, $uploaded) {
                if ($removedImages->isNotEmpty()) {
                    ServiceReviewImage::query()
                        ->whereIn('id', $removedImages->pluck('id'))
                        ->delete();
                }

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

                $this->persistImages($review, $uploaded);
            });
        } catch (Throwable $exception) {
            $this->destroyUploaded($cloudinary, $uploaded);

            throw $exception;
        }

        foreach ($removedPublicIds as $publicId) {
            $cloudinary->destroy($publicId);
        }

        $review->load(['user', 'images', 'booking']);

        return response()->json([
            'success' => true,
            'message' => 'Review updated.',
            'data' => $this->reviewPayload($review),
        ]);
    }

    public function destroy(Request $request, int $id, CloudinaryService $cloudinary): JsonResponse
    {
        $review = ServiceReview::with('images')->findOrFail($id);
        $user = $request->user();

        if ($review->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $publicIds = $review->images
            ->pluck('public_id')
            ->filter()
            ->unique()
            ->values()
            ->all();

        DB::transaction(fn () => $review->delete());

        foreach ($publicIds as $publicId) {
            $cloudinary->destroy($publicId);
        }

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
            ->where('check_out', '<', now())
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

    private function uploadedImages(Request $request): array
    {
        $files = $request->file('images', []);

        if (! is_array($files)) {
            $files = [$files];
        }

        return array_values(array_filter($files));
    }

    private function assertImageCapacity(int $existingCount, int $newCount): void
    {
        if ($existingCount + $newCount > self::MAX_IMAGES) {
            throw ValidationException::withMessages([
                'images' => 'A review can have at most ' . self::MAX_IMAGES . ' images.',
            ]);
        }
    }

    private function uploadImages(CloudinaryService $cloudinary, array $files): array
    {
        $uploaded = [];

        try {
            foreach ($files as $index => $file) {
                $uploaded[$index] = $cloudinary->upload($file, self::CLOUDINARY_FOLDER);
            }
        } catch (Throwable $exception) {
            $this->destroyUploaded($cloudinary, $uploaded);

            throw $exception;
        }

        return $uploaded;
    }

    private function persistImages(ServiceReview $review, array $uploaded): void
    {
        if ($uploaded === []) {
            return;
        }

        $startOrder = $review->images()->count();

        foreach ($uploaded as $index => $image) {
            $review->images()->create([
                'image_url' => $image['url'],
                'public_id' => $image['public_id'],
                'sort_order' => $startOrder + $index,
            ]);
        }
    }

    private function destroyUploaded(CloudinaryService $cloudinary, array $uploaded): void
    {
        foreach ($uploaded as $image) {
            $cloudinary->destroy($image['public_id']);
        }
    }

    private function imageConfigurationError(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Cloudinary image uploads are not configured. Add the Cloudinary credentials to the backend environment.',
        ], 422);
    }

    private function reviewPayload(ServiceReview $review): array
    {
        return [
            'id' => $review->id,
            'service_id' => $review->service_id,
            'user_id' => $review->user_id,
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
