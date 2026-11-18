<?php

return [
    'enabled' => env('ASSISTANT_ENABLED', true),

    'url' => env('OLLAMA_URL', 'http://127.0.0.1:11434'),

    'model' => env('OLLAMA_MODEL', 'qwen2.5:3b-instruct'),

    'timeout' => (int) env('OLLAMA_TIMEOUT', 60),

    'keep_alive' => env('OLLAMA_KEEP_ALIVE', '10m'),
];
