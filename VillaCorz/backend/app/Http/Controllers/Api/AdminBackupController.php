<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
use App\Services\DatabaseBackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

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

    public function download(string $filename, Request $request): Response
    {
        $backup = $this->backups->read($filename);
        if ($backup === null) {
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

        return response($backup['contents'], 200, [
            'Content-Type' => 'application/sql',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
