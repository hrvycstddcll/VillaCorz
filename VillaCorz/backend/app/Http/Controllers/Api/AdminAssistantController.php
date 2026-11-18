<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Assistant\AssistantContextBuilder;
use App\Services\Assistant\AssistantPrompt;
use App\Services\Assistant\OllamaClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class AdminAssistantController extends Controller
{
    private const ALLOWED_PAGES = ['dashboard', 'reports', 'offers', 'other'];

    private const ALLOWED_REPORTS = [
        'revenue',
        'bookings',
        'cancellations',
        'reviews',
        'contacts',
        'payments',
        'guests',
        'traffic',
        'activity',
    ];

    public function status(OllamaClient $ollama): JsonResponse
    {
        if (! config('assistant.enabled')) {
            return response()->json([
                'success' => false,
                'message' => 'The reporting assistant is disabled.',
            ], 503);
        }

        $reachable = $ollama->ping();

        return response()->json([
            'success' => $reachable,
            'data' => [
                'enabled' => true,
                'reachable' => $reachable,
                'model' => (string) config('assistant.model'),
            ],
            'message' => $reachable ? null : 'The AI service is not reachable.',
        ]);
    }

    public function chat(
        Request $request,
        AssistantContextBuilder $contextBuilder,
        OllamaClient $ollama,
    ): JsonResponse {
        if (! config('assistant.enabled')) {
            return response()->json([
                'success' => false,
                'message' => 'The reporting assistant is disabled.',
            ], 503);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:600'],
            'context' => ['nullable', 'array'],
            'context.page' => ['nullable', 'string', 'max:40'],
            'context.report' => ['nullable', 'string', 'max:40'],
            'context.from' => ['nullable', 'date'],
            'context.to' => ['nullable', 'date', 'after_or_equal:context.from'],
            'context.range' => ['nullable', 'integer', 'in:7,30,90'],
            'history' => ['nullable', 'array', 'max:6'],
            'history.*.role' => ['required_with:history', 'in:user,assistant'],
            'history.*.content' => ['required_with:history', 'string', 'max:1200'],
        ]);

        $context = $validated['context'] ?? [];
        $page = in_array($context['page'] ?? null, self::ALLOWED_PAGES, true)
            ? (string) $context['page']
            : 'dashboard';
        $report = in_array($context['report'] ?? null, self::ALLOWED_REPORTS, true)
            ? (string) $context['report']
            : null;

        $snapshotContext = [
            'page' => $page,
            'report' => $report,
            'from' => $context['from'] ?? null,
            'to' => $context['to'] ?? null,
            'range' => (int) ($context['range'] ?? 30),
        ];

        $messages = collect($validated['history'] ?? [])
            ->map(fn (array $item) => [
                'role' => (string) $item['role'],
                'content' => strip_tags((string) $item['content']),
            ])
            ->values()
            ->all();

        $question = "<user_question>\n".strip_tags((string) $validated['message'])."\n</user_question>";
        $messages[] = ['role' => 'user', 'content' => $question];

        try {
            $snapshot = $contextBuilder->build($snapshotContext);
            $answer = $ollama->chat(AssistantPrompt::system($snapshot), $messages);
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
                    'report' => $report,
                    'window' => $snapshot['window'],
                ],
                'generated_at' => now()->toIso8601String(),
            ],
        ]);
    }
}
