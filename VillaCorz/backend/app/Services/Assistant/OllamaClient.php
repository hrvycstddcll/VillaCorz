<?php

namespace App\Services\Assistant;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OllamaClient
{
    public function chat(string $systemPrompt, array $messages): string
    {
        return $this->isGroq()
            ? $this->chatWithGroq($systemPrompt, $messages)
            : $this->chatWithOllama($systemPrompt, $messages);
    }

    public function ping(): bool
    {
        return $this->isGroq() ? $this->pingGroq() : $this->pingOllama();
    }

    private function chatWithGroq(string $systemPrompt, array $messages): string
    {
        if (! $this->isGroqConfigured()) {
            throw new RuntimeException('The AI provider is not configured.');
        }

        $payload = [
            'model' => (string) config('assistant.groq_model'),
            'messages' => array_merge(
                [['role' => 'system', 'content' => $systemPrompt]],
                $messages,
            ),
            'temperature' => 0.2,
            'max_tokens' => 500,
        ];

        try {
            $response = Http::withToken((string) config('assistant.groq_key'))
                ->timeout((int) config('assistant.timeout'))
                ->connectTimeout(10)
                ->post($this->groqUrl('/chat/completions'), $payload);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('The AI service is not reachable.', 0, $exception);
        }

        if ($response->status() === 401) {
            throw new RuntimeException('The AI provider rejected the API key.');
        }

        if ($response->status() === 429) {
            throw new RuntimeException('The AI provider rate limit was reached. Try again shortly.');
        }

        if (! $response->successful()) {
            throw new RuntimeException('The AI service returned an error.');
        }

        $answer = trim((string) $response->json('choices.0.message.content', ''));

        if ($answer === '') {
            throw new RuntimeException('The AI service returned an empty answer.');
        }

        return $answer;
    }

    private function chatWithOllama(string $systemPrompt, array $messages): string
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

    private function pingGroq(): bool
    {
        if (! $this->isGroqConfigured()) {
            return false;
        }

        try {
            return Http::withToken((string) config('assistant.groq_key'))
                ->timeout(10)
                ->connectTimeout(5)
                ->get($this->groqUrl('/models'))
                ->successful();
        } catch (ConnectionException) {
            return false;
        }
    }

    private function pingOllama(): bool
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

    private function isGroq(): bool
    {
        return strtolower((string) config('assistant.provider')) === 'groq';
    }

    private function isGroqConfigured(): bool
    {
        return trim((string) config('assistant.groq_key')) !== '';
    }

    private function groqUrl(string $path): string
    {
        return rtrim((string) config('assistant.groq_url'), '/').$path;
    }

    private function url(string $path): string
    {
        return rtrim((string) config('assistant.url'), '/').$path;
    }
}
