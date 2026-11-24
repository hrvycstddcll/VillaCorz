<?php

return [
    'driver' => env('BACKUP_DRIVER', env('APP_ENV') === 'production' ? 'database' : 'local'),

    'disk' => env('BACKUP_DISK', 'local'),

    'directory' => env('BACKUP_DIR', 'backups'),

    'keep' => (int) env('BACKUP_KEEP', 5),
];
