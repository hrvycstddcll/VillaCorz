<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;
use RuntimeException;
use Throwable;

class CloudinaryService
{
    private ?Cloudinary $cloudinary = null;

    /**
     * Determine whether the Cloudinary credentials are configured.
     */
    public function isConfigured(): bool
    {
        return filled(config('services.cloudinary.cloud_name'))
            && filled(config('services.cloudinary.api_key'))
            && filled(config('services.cloudinary.api_secret'));
    }

    /**
     * Upload an image to Cloudinary and return its secure URL and public ID.
     *
     * @return array{url: string, public_id: string}
     */
    public function upload(UploadedFile $file): array
    {
        try {
            $result = $this->client()->uploadApi()->upload($file->getRealPath(), [
                'folder' => config('services.cloudinary.folder', 'villacorz/services'),
                'resource_type' => 'image',
            ]);
        } catch (Throwable $exception) {
            report($exception);

            throw new RuntimeException(
                'Unable to upload the image to Cloudinary. Please try again.',
                previous: $exception,
            );
        }

        $url = $result['secure_url'] ?? null;
        $publicId = $result['public_id'] ?? null;

        if (! is_string($url) || ! is_string($publicId)) {
            throw new RuntimeException('Cloudinary did not return a valid image URL.');
        }

        return [
            'url' => $url,
            'public_id' => $publicId,
        ];
    }

    /**
     * Delete an image from Cloudinary. Failures are reported but not rethrown
     * so a database operation can still complete.
     */
    public function destroy(string $publicId): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        try {
            $this->client()->uploadApi()->destroy($publicId, [
                'resource_type' => 'image',
                'invalidate' => true,
            ]);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function client(): Cloudinary
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException(
                'Cloudinary image uploads are not configured. Add the Cloudinary credentials to the backend environment.',
            );
        }

        if ($this->cloudinary === null) {
            $this->cloudinary = new Cloudinary([
                'cloud' => [
                    'cloud_name' => config('services.cloudinary.cloud_name'),
                    'api_key' => config('services.cloudinary.api_key'),
                    'api_secret' => config('services.cloudinary.api_secret'),
                ],
                'url' => [
                    'secure' => true,
                ],
            ]);
        }

        return $this->cloudinary;
    }
}
