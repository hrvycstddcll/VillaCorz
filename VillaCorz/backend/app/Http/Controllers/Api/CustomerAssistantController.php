<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Assistant\CustomerAssistantContextBuilder;
use App\Services\Assistant\CustomerAssistantPrompt;
use App\Services\Assistant\OllamaClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class CustomerAssistantController extends Controller
{
    private const ALLOWED_PAGES = [
        'home',
        'services',
        'bookings',
        'settings',
        'payment',
        'other',
    ];

    public function chat(
        Request $request,
        CustomerAssistantContextBuilder $contextBuilder,
        OllamaClient $ollama,
    ): JsonResponse {
        $user = $request->user();

        if ($user === null || $user->role !== 'customer') {
            return response()->json([
                'success' => false,
                'message' => 'This assistant is available only to customer accounts.',
            ], 403);
        }

        if (! config('assistant.enabled')) {
            return response()->json([
                'success' => false,
                'message' => 'The VillaCorz assistant is currently unavailable.',
            ], 503);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:600'],
            'context' => ['nullable', 'array'],
            'context.page' => ['nullable', 'string', 'max:40'],
            'context.user_location' => ['nullable', 'array'],
            'context.user_location.lat' => ['nullable', 'numeric', 'between:-90,90'],
            'context.user_location.lng' => ['nullable', 'numeric', 'between:-180,180'],
            'history' => ['nullable', 'array', 'max:6'],
            'history.*.role' => ['required_with:history', 'in:user,assistant'],
            'history.*.content' => ['required_with:history', 'string', 'max:1200'],
        ]);

        $page = in_array($validated['context']['page'] ?? null, self::ALLOWED_PAGES, true)
            ? (string) $validated['context']['page']
            : 'other';

        $location = $validated['context']['user_location'] ?? null;
        $userLocation = null;

        if (is_array($location)
            && is_numeric($location['lat'] ?? null)
            && is_numeric($location['lng'] ?? null)
        ) {
            $userLocation = [
                'lat' => (float) $location['lat'],
                'lng' => (float) $location['lng'],
            ];
        }

        $messages = collect($validated['history'] ?? [])
            ->map(function (array $item): array {
                $content = strip_tags((string) $item['content']);

                if ($item['role'] === 'user') {
                    $content = "<user_question>\n{$content}\n</user_question>";
                }

                return [
                    'role' => (string) $item['role'],
                    'content' => $content,
                ];
            })
            ->values()
            ->all();

        $rawMessage = strip_tags((string) $validated['message']);
        $question = "<user_question>\n{$rawMessage}\n</user_question>";
        $messages[] = ['role' => 'user', 'content' => $question];

        try {
            $snapshot = $contextBuilder->build($user, $page, $rawMessage, $userLocation);
            $answer = $ollama->chat(CustomerAssistantPrompt::system($snapshot), $messages);
        } catch (RuntimeException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 502);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'answer' => $answer,
                'sources' => [
                    'page' => $page,
                    'generated_at' => now()->toIso8601String(),
                ],
            ],
        ]);
    }
}
