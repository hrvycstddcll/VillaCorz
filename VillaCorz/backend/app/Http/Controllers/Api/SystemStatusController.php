<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class SystemStatusController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'mail' => $this->mailConfigured(),
                'cloudinary' => $this->cloudinaryConfigured(),
                'assistant' => $this->assistantConfigured(),
                'forecast' => filled(config('forecasting.url')),
                'backup' => filled(config('backup.driver')),
                'database' => $this->databaseConfigured(),
            ],
        ]);
    }

    private function mailConfigured(): bool
    {
        $mailer = (string) config('mail.default');

        if (in_array($mailer, ['', 'log', 'array'], true) || blank(config('mail.from.address'))) {
            return false;
        }

        return match ($mailer) {
            'brevo' => filled(config('services.brevo.key')),
            'smtp' => filled(config('mail.mailers.smtp.host')),
            default => true,
        };
    }

    private function cloudinaryConfigured(): bool
    {
        return filled(config('services.cloudinary.cloud_name'))
            && filled(config('services.cloudinary.api_key'))
            && filled(config('services.cloudinary.api_secret'));
    }

    private function assistantConfigured(): bool
    {
        if (! config('assistant.enabled')) {
            return false;
        }

        return match ((string) config('assistant.provider')) {
            'groq' => filled(config('assistant.groq_key')),
            'ollama' => filled(config('assistant.url')),
            default => false,
        };
    }

    private function databaseConfigured(): bool
    {
        $connection = (string) config('database.default');

        return filled($connection) && filled(config('database.connections.'.$connection));
    }
}
