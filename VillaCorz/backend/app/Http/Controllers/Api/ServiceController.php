<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\ServiceImage;
use App\Services\ActivityLogger;
use App\Services\CloudinaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class ServiceController extends Controller
{
    private const MAX_IMAGES = 10;

    public function index(): JsonResponse
    {
        $services = Service::with('images')
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $services,
        ]);
    }

    public function store(Request $request, CloudinaryService $cloudinary): JsonResponse
    {
        $validated = $this->validateService($request);
        $this->ensureSingleExclusive($validated['kind'] ?? 'room');

        $files = $this->uploadedImages($request);
        $orderProvided = $request->boolean('image_order_present') || $request->exists('image_order');

        $orderTokens = $this->buildOrder(
            $orderProvided ? ($validated['image_order'] ?? []) : null,
            $files,
            [],
        );

        $this->validateOrder($orderTokens, $files, []);

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
            $service = DB::transaction(function () use ($request, $validated, $orderTokens, $uploaded) {
                $service = Service::create([
                    'created_by' => $request->user()?->id,
                    'kind' => $validated['kind'] ?? 'room',
                    'name' => $validated['name'],
                    'description' => $validated['description'] ?? null,
                    'price' => $validated['price'],
                    'weekend_price' => $validated['weekend_price'] ?? null,
                    'weekday_discount_type' => $validated['weekday_discount_type'] ?? null,
                    'weekday_discount_value' => filled($validated['weekday_discount_type'] ?? null)
                        ? ($validated['weekday_discount_value'] ?? null)
                        : null,
                    'weekend_discount_type' => $validated['weekend_discount_type'] ?? null,
                    'weekend_discount_value' => filled($validated['weekend_discount_type'] ?? null)
                        ? ($validated['weekend_discount_value'] ?? null)
                        : null,
                    'pax' => $validated['pax'] ?? null,
                    'features' => $this->cleanList($validated['features'] ?? []),
                    'amenities' => $this->cleanList($validated['amenities'] ?? []),
                    'status' => $validated['status'],
                ]);

                $primaryToken = $this->resolvePrimaryToken(
                    $orderTokens,
                    $validated['primary_image'] ?? null,
                );

                foreach ($orderTokens as $position => $token) {
                    [$type, $index] = $this->parseToken($token);

                    if ($type !== 'new' || ! isset($uploaded[$index])) {
                        throw ValidationException::withMessages([
                            'image_order' => 'One or more images could not be found.',
                        ]);
                    }

                    $service->images()->create([
                        'image_url' => $uploaded[$index]['url'],
                        'public_id' => $uploaded[$index]['public_id'],
                        'is_primary' => $token === $primaryToken,
                        'sort_order' => $position,
                    ]);
                }

                return $service;
            });
        } catch (Throwable $exception) {
            $this->destroyUploaded($cloudinary, $uploaded);

            throw $exception;
        }

        $service = $service->fresh('images');

        ActivityLogger::record(
            'created',
            $request->user(),
            "Created offer \u{201C}{$service->name}\u{201D}.",
            Service::class,
            $service->id,
            [
                'name' => $service->name,
                'kind' => $service->kind,
                'status' => $service->status,
                'price' => $service->price,
                'weekend_price' => $service->weekend_price,
                'weekday_discount_type' => $service->weekday_discount_type,
                'weekday_discount_value' => $service->weekday_discount_value,
                'weekend_discount_type' => $service->weekend_discount_type,
                'weekend_discount_value' => $service->weekend_discount_value,
                'pax' => $service->pax,
                'image_count' => $service->images->count(),
            ],
            $request,
        );

        return response()->json([
            'success' => true,
            'message' => 'Service created successfully.',
            'data' => $service,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $service = Service::with('images')
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $service,
        ]);
    }

    public function update(Request $request, int $id, CloudinaryService $cloudinary): JsonResponse
    {
        $service = Service::with('images')
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->findOrFail($id);
        $validated = $this->validateService($request);
        $this->ensureSingleExclusive(
            $validated['kind'] ?? $service->kind,
            $service->id,
        );

        $before = $service->only([
            'name',
            'kind',
            'description',
            'price',
            'weekend_price',
            'weekday_discount_type',
            'weekday_discount_value',
            'weekend_discount_type',
            'weekend_discount_value',
            'pax',
            'features',
            'amenities',
            'status',
        ]);
        $beforeImageCount = $service->images->count();

        $files = $this->uploadedImages($request);
        $existingIds = $service->images->pluck('id')->all();
        $orderProvided = $request->boolean('image_order_present') || $request->exists('image_order');

        $orderTokens = $this->buildOrder(
            $orderProvided ? ($validated['image_order'] ?? []) : null,
            $files,
            $existingIds,
        );

        $this->validateOrder($orderTokens, $files, $existingIds);

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

        $removedPublicIds = [];

        $detailUpdates = [
            'pax' => $validated['pax'] ?? null,
        ];

        if ($request->exists('weekend_price')) {
            $detailUpdates['weekend_price'] = $validated['weekend_price'] ?? null;
        }

        if ($request->boolean('features_present')) {
            $detailUpdates['features'] = $this->cleanList(
                $validated['features'] ?? [],
            );
        }

        if ($request->boolean('amenities_present')) {
            $detailUpdates['amenities'] = $this->cleanList(
                $validated['amenities'] ?? [],
            );
        }

        if ($request->exists('weekday_discount_type') || $request->exists('weekday_discount_value')) {
            $detailUpdates['weekday_discount_type'] = $validated['weekday_discount_type'] ?? null;
            $detailUpdates['weekday_discount_value'] = filled($validated['weekday_discount_type'] ?? null)
                ? ($validated['weekday_discount_value'] ?? null)
                : null;
        }

        if ($request->exists('weekend_discount_type') || $request->exists('weekend_discount_value')) {
            $detailUpdates['weekend_discount_type'] = $validated['weekend_discount_type'] ?? null;
            $detailUpdates['weekend_discount_value'] = filled($validated['weekend_discount_type'] ?? null)
                ? ($validated['weekend_discount_value'] ?? null)
                : null;
        }

        try {
            DB::transaction(function () use (
                $service,
                $validated,
                $detailUpdates,
                $orderTokens,
                $uploaded,
                &$removedPublicIds,
            ) {
                $service->update(array_merge([
                    'kind' => $validated['kind'] ?? $service->kind,
                    'name' => $validated['name'],
                    'description' => $validated['description'] ?? null,
                    'price' => $validated['price'],
                    'status' => $validated['status'],
                ], $detailUpdates));

                $existing = $service->images()->get()->keyBy('id');
                $primaryToken = $this->resolvePrimaryToken(
                    $orderTokens,
                    $validated['primary_image'] ?? null,
                );
                $retainedIds = [];

                foreach ($orderTokens as $position => $token) {
                    [$type, $index] = $this->parseToken($token);

                    if ($type === 'existing') {
                        if (! $existing->has($index)) {
                            throw ValidationException::withMessages([
                                'image_order' => 'One or more images do not belong to this service.',
                            ]);
                        }

                        /** @var ServiceImage $image */
                        $image = $existing->get($index);
                        $image->update([
                            'is_primary' => $token === $primaryToken,
                            'sort_order' => $position,
                        ]);
                        $retainedIds[$index] = true;

                        continue;
                    }

                    if (! isset($uploaded[$index])) {
                        throw ValidationException::withMessages([
                            'image_order' => 'One or more images could not be found.',
                        ]);
                    }

                    $service->images()->create([
                        'image_url' => $uploaded[$index]['url'],
                        'public_id' => $uploaded[$index]['public_id'],
                        'is_primary' => $token === $primaryToken,
                        'sort_order' => $position,
                    ]);
                }

                foreach ($existing as $imageId => $image) {
                    if (isset($retainedIds[$imageId])) {
                        continue;
                    }

                    if (filled($image->public_id)) {
                        $removedPublicIds[] = $image->public_id;
                    }

                    $image->delete();
                }
            });
        } catch (Throwable $exception) {
            $this->destroyUploaded($cloudinary, $uploaded);

            throw $exception;
        }

        foreach (array_unique($removedPublicIds) as $publicId) {
            $cloudinary->destroy($publicId);
        }

        $service = $service->fresh('images');

        $after = $service->only(array_keys($before));
        $changedFields = [];

        foreach ($after as $field => $value) {
            if ($this->logComparable($before[$field] ?? null) !== $this->logComparable($value)) {
                $changedFields[] = $field;
            }
        }

        if ($beforeImageCount !== $service->images->count()) {
            $changedFields[] = 'images';
        }

        ActivityLogger::record(
            'updated',
            $request->user(),
            "Updated offer \u{201C}{$service->name}\u{201D}.",
            Service::class,
            $service->id,
            [
                'name' => $service->name,
                'status' => $service->status,
                'changed_fields' => $changedFields,
            ],
            $request,
        );

        return response()->json([
            'success' => true,
            'message' => 'Service updated successfully.',
            'data' => $service,
        ]);
    }

    public function destroy(Request $request, int $id, CloudinaryService $cloudinary): JsonResponse
    {
        $service = Service::with('images')
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->findOrFail($id);

        $publicIds = $service->images
            ->pluck('public_id')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $deletedId = $service->id;
        $deletedName = $service->name;

        DB::transaction(fn () => $service->delete());

        foreach ($publicIds as $publicId) {
            $cloudinary->destroy($publicId);
        }

        ActivityLogger::record(
            'deleted',
            $request->user(),
            "Deleted offer \u{201C}{$deletedName}\u{201D}.",
            Service::class,
            $deletedId,
            ['name' => $deletedName],
            $request,
        );

        return response()->json([
            'success' => true,
            'message' => 'Service deleted successfully.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateService(Request $request): array
    {
        $validated = $request->validate([
            'kind' => ['sometimes', 'string', 'in:room,exclusive'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'weekend_price' => ['nullable', 'numeric', 'min:0'],
            'weekday_discount_type' => ['nullable', 'in:percent,fixed'],
            'weekday_discount_value' => ['nullable', 'numeric', 'min:0'],
            'weekend_discount_type' => ['nullable', 'in:percent,fixed'],
            'weekend_discount_value' => ['nullable', 'numeric', 'min:0'],
            'pax' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'features' => ['nullable', 'array', 'max:20'],
            'features.*' => ['string', 'max:80'],
            'amenities' => ['nullable', 'array', 'max:20'],
            'amenities.*' => ['string', 'max:80'],
            'features_present' => ['sometimes', 'boolean'],
            'amenities_present' => ['sometimes', 'boolean'],
            'status' => ['required', 'in:active,inactive'],
            'images' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            'images.*' => ['image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'image_order' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            'image_order.*' => ['string', 'regex:/^(existing:\d+|new:\d+)$/'],
            'image_order_present' => ['sometimes', 'boolean'],
            'primary_image' => ['nullable', 'string', 'regex:/^(existing:\d+|new:\d+)$/'],
        ]);

        foreach (['weekday', 'weekend'] as $day) {
            $typeField = "{$day}_discount_type";
            $valueField = "{$day}_discount_value";

            // Treat an empty type as "no discount" and discard any orphaned
            // value so the database always stores a clean pair.
            if (! filled($validated[$typeField] ?? null)) {
                $validated[$typeField] = null;
                $validated[$valueField] = null;

                continue;
            }

            $this->assertValidDiscount(
                $day,
                $validated[$typeField],
                $validated[$valueField] ?? null,
                (float) $validated['price'],
            );
        }

        return $validated;
    }

    /**
     * The whole villa is a single exclusive offer, so keep only one.
     */
    private function ensureSingleExclusive(?string $kind, ?int $ignoreId = null): void
    {
        if ($kind !== 'exclusive') {
            return;
        }

        $exists = Service::query()
            ->where('kind', 'exclusive')
            ->when($ignoreId !== null, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'kind' => 'An exclusive whole-villa offer already exists.',
            ]);
        }
    }

    private function assertValidDiscount(
        string $day,
        ?string $type,
        mixed $value,
        float $price,
    ): void {        if ($type === null) {
            return;
        }

        $field = "{$day}_discount_value";
        $amount = (float) ($value ?? 0);

        if ($amount <= 0) {
            throw ValidationException::withMessages([
                $field => 'Discount must be greater than zero.',
            ]);
        }

        if ($type === 'percent' && $amount > 100) {
            throw ValidationException::withMessages([
                $field => 'Percentage discount cannot exceed 100%.',
            ]);
        }

        if ($type === 'fixed' && $amount > $price) {
            throw ValidationException::withMessages([
                $field => 'Fixed discount cannot exceed the offer price.',
            ]);
        }
    }

    /**
     * Trim, drop blanks and remove duplicates from a list of labels.
     *
     * @param  array<int, mixed>  $items
     * @return array<int, string>
     */
    private function cleanList(array $items): array
    {
        $cleaned = [];

        foreach ($items as $item) {
            if (! is_string($item)) {
                continue;
            }

            $value = trim($item);

            if ($value !== '' && ! in_array($value, $cleaned, true)) {
                $cleaned[] = $value;
            }
        }

        return $cleaned;
    }

    private function logComparable(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
    }

    /**
     * @return array<int, \Illuminate\Http\UploadedFile>
     */
    private function uploadedImages(Request $request): array
    {
        $files = $request->file('images', []);

        if (! is_array($files)) {
            $files = [$files];
        }

        return array_values(array_filter($files));
    }

    /**
     * Build the final, ordered list of image tokens.
     *
     * @param  array<int, mixed>  $order
     * @param  array<int, \Illuminate\Http\UploadedFile>  $files
     * @param  array<int, int>  $existingIds
     * @return array<int, string>
     */
    private function buildOrder(?array $order, array $files, array $existingIds): array
    {
        $tokens = [];

        if ($order === null) {
            foreach ($existingIds as $existingId) {
                $tokens[] = "existing:{$existingId}";
            }
        } else {
            foreach ($order as $token) {
                if (is_string($token) && ! in_array($token, $tokens, true)) {
                    $tokens[] = $token;
                }
            }
        }

        $referencedNewIndexes = [];

        foreach ($tokens as $token) {
            [$type, $index] = $this->parseToken($token);

            if ($type === 'new') {
                $referencedNewIndexes[] = $index;
            }
        }

        foreach (array_keys($files) as $index) {
            if (! in_array($index, $referencedNewIndexes, true)) {
                $tokens[] = "new:{$index}";
            }
        }

        return $tokens;
    }

    /**
     * @param  array<int, string>  $tokens
     * @param  array<int, \Illuminate\Http\UploadedFile>  $files
     * @param  array<int, int>  $existingIds
     */
    private function validateOrder(array $tokens, array $files, array $existingIds): void
    {
        if (count($tokens) > self::MAX_IMAGES) {
            throw ValidationException::withMessages([
                'images' => 'A service can have at most '.self::MAX_IMAGES.' images.',
            ]);
        }

        foreach ($tokens as $token) {
            [$type, $index] = $this->parseToken($token);

            if ($type === 'existing' && ! in_array($index, $existingIds, true)) {
                throw ValidationException::withMessages([
                    'image_order' => 'One or more images do not belong to this service.',
                ]);
            }

            if ($type === 'new' && ! array_key_exists($index, $files)) {
                throw ValidationException::withMessages([
                    'image_order' => 'One or more images could not be found.',
                ]);
            }
        }
    }

    /**
     * @param  array<int, string>  $tokens
     */
    private function resolvePrimaryToken(array $tokens, ?string $primaryToken): ?string
    {
        if ($primaryToken !== null && in_array($primaryToken, $tokens, true)) {
            return $primaryToken;
        }

        return $tokens[0] ?? null;
    }

    /**
     * @return array{0: string, 1: int}
     */
    private function parseToken(string $token): array
    {
        [$type, $index] = explode(':', $token, 2);

        return [$type, (int) $index];
    }

    /**
     * @param  array<int, \Illuminate\Http\UploadedFile>  $files
     * @return array<int, array{url: string, public_id: string}>
     */
    private function uploadImages(CloudinaryService $cloudinary, array $files): array
    {
        $uploaded = [];

        try {
            foreach ($files as $index => $file) {
                $uploaded[$index] = $cloudinary->upload($file);
            }
        } catch (Throwable $exception) {
            $this->destroyUploaded($cloudinary, $uploaded);

            throw $exception;
        }

        return $uploaded;
    }

    /**
     * @param  array<int, array{url: string, public_id: string}>  $uploaded
     */
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
}
