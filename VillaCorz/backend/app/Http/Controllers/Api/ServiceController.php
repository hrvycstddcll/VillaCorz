<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\ServiceImage;
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
                    'name' => $validated['name'],
                    'description' => $validated['description'] ?? null,
                    'price' => $validated['price'],
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

        return response()->json([
            'success' => true,
            'message' => 'Service created successfully.',
            'data' => $service->fresh('images'),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $service = Service::with('images')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $service,
        ]);
    }

    public function update(Request $request, int $id, CloudinaryService $cloudinary): JsonResponse
    {
        $service = Service::with('images')->findOrFail($id);
        $validated = $this->validateService($request);

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

        try {
            DB::transaction(function () use (
                $service,
                $validated,
                $orderTokens,
                $uploaded,
                &$removedPublicIds,
            ) {
                $service->update([
                    'name' => $validated['name'],
                    'description' => $validated['description'] ?? null,
                    'price' => $validated['price'],
                    'status' => $validated['status'],
                ]);

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

        return response()->json([
            'success' => true,
            'message' => 'Service updated successfully.',
            'data' => $service->fresh('images'),
        ]);
    }

    public function destroy(int $id, CloudinaryService $cloudinary): JsonResponse
    {
        $service = Service::with('images')->findOrFail($id);

        $publicIds = $service->images
            ->pluck('public_id')
            ->filter()
            ->unique()
            ->values()
            ->all();

        DB::transaction(fn () => $service->delete());

        foreach ($publicIds as $publicId) {
            $cloudinary->destroy($publicId);
        }

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
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'status' => ['required', 'in:active,inactive'],
            'images' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            'images.*' => ['image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'image_order' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            'image_order.*' => ['string', 'regex:/^(existing:\d+|new:\d+)$/'],
            'image_order_present' => ['sometimes', 'boolean'],
            'primary_image' => ['nullable', 'string', 'regex:/^(existing:\d+|new:\d+)$/'],
        ]);
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
