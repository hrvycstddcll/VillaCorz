<?php

return [
    'enabled' => env('ASSISTANT_ENABLED', true),

    'provider' => env('ASSISTANT_PROVIDER', 'ollama'),

    'url' => env('OLLAMA_URL', 'http://127.0.0.1:11434'),

    'model' => env('OLLAMA_MODEL', 'qwen2.5:3b-instruct'),

    'timeout' => (int) env('OLLAMA_TIMEOUT', 60),

    'keep_alive' => env('OLLAMA_KEEP_ALIVE', '10m'),

    'groq_url' => env('GROQ_URL', 'https://api.groq.com/openai/v1'),

    'groq_key' => env('GROQ_API_KEY'),

    'groq_model' => env('GROQ_MODEL', 'openai/gpt-oss-20b'),
];
