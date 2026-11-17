<?php

return [
    'url' => env('FORECAST_SERVICE_URL', 'http://127.0.0.1:8001'),
    'timeout' => (int) env('FORECAST_SERVICE_TIMEOUT', 12),
];
