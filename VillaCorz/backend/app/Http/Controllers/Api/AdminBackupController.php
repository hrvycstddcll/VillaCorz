<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
use App\Services\DatabaseBackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminBackupController extends Controller
{
    public function __construct(private readonly DatabaseBackupService $backups) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->backups->list(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $backup = $this->backups->create();

        ActivityLogger::record(
            'backup.created',
            $request->user(),
            'Saved a database backup.',
            'backup',
            $backup['filename'],
            ['size' => $backup['size']],
            $request,
        );

        return response()->json([
            'success' => true,
            'data' => $backup,
        ], 201);
    }

    public function download(string $filename, Request $request): StreamedResponse
    {
        $path = $this->backups->resolvePath($filename);
        if ($path === null) {
            abort(404);
        }

        ActivityLogger::record(
            'backup.downloaded',
            $request->user(),
            'Downloaded a saved backup.',
            'backup',
            $filename,
            [],
            $request,
        );

        return Storage::disk(config('backup.disk'))
            ->download($path, $filename, ['Content-Type' => 'application/sql']);
    }
}
