<?php

namespace App\Support;

final class AssistantHistory
{
    public const MAX_MESSAGES = 6;

    public const MAX_CONTENT_LENGTH = 1200;

    /**
     * @param  mixed  $history
     * @return array<int, array{role: mixed, content: string}>
     */
    public static function normalize(mixed $history): array
    {
        if (! is_array($history)) {
            return [];
        }

        $messages = [];

        foreach (array_slice($history, -self::MAX_MESSAGES) as $item) {
            if (! is_array($item)) {
                continue;
            }

            $content = strip_tags((string) ($item['content'] ?? ''));
            $content = preg_replace('/\s+/u', ' ', trim($content)) ?? '';

            if (mb_strlen($content) > self::MAX_CONTENT_LENGTH) {
                $content = mb_substr($content, 0, self::MAX_CONTENT_LENGTH - 1).'…';
            }

            $messages[] = [
                'role' => $item['role'] ?? null,
                'content' => $content,
            ];
        }

        return $messages;
    }
}
