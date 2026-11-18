<?php

namespace App\Services\Assistant;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OllamaClient
{
    public function chat(string $systemPrompt, array $messages): string
    {
        $payload = [
            'model' => (string) config('assistant.model'),
            'stream' => false,
            'messages' => array_merge(
                [['role' => 'system', 'content' => $systemPrompt]],
                $messages,
            ),
            'options' => [
                'temperature' => 0.2,
                'num_ctx' => 8192,
                'num_predict' => 500,
            ],
            'keep_alive' => (string) config('assistant.keep_alive'),
        ];

        try {
            $response = Http::timeout((int) config('assistant.timeout'))
                ->connectTimeout(10)
                ->post($this->url('/api/chat'), $payload);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('The AI service is not reachable.', 0, $exception);
        }

        if (! $response->successful()) {
            throw new RuntimeException('The AI service returned an error.');
        }

        $answer = trim((string) $response->json('message.content', ''));

        if ($answer === '') {
            throw new RuntimeException('The AI service returned an empty answer.');
        }

        return $answer;
    }

    public function ping(): bool
    {
        try {
            return Http::timeout(10)
                ->connectTimeout(5)
                ->get($this->url('/api/tags'))
                ->successful();
        } catch (ConnectionException) {
            return false;
        }
    }

    private function url(string $path): string
    {
        return rtrim((string) config('assistant.url'), '/').$path;
    }
}
