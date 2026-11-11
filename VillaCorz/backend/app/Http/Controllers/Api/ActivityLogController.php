<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityLogController extends Controller
{
    private const CHANGE_ACTIONS = ['created', 'updated', 'deleted'];

    private const ACCESS_ACTIONS = ['login', 'logout', 'login_failed', 'registered'];

    public function index(Request $request): JsonResponse
    {
        $this->validateFilters($request);

        $perPage = min(max((int) $request->integer('per_page', 20), 5), 100);

        $logs = $this->filteredQuery($request)
            ->with('user:id,firstname,lastname,email,role')
            ->latest('created_at')
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json(array_merge([
            'success' => true,
        ], $logs->toArray()));
    }

    public function summary(): JsonResponse
    {
        $today = now()->startOfDay();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => ActivityLog::count(),
                'changes' => ActivityLog::whereIn('action', self::CHANGE_ACTIONS)->count(),
                'access' => ActivityLog::whereIn('action', self::ACCESS_ACTIONS)->count(),
                'today' => ActivityLog::where('created_at', '>=', $today)->count(),
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $this->validateFilters($request);

        $logs = $this->filteredQuery($request)
            ->with('user:id,firstname,lastname,email')
            ->latest('created_at')
            ->latest('id');

        $filename = 'villacorz-activity-log-'.now()->format('Y-m-d-His').'.csv';

        return response()->streamDownload(function () use ($logs) {
            $handle = fopen('php://output', 'w');

            if ($handle === false) {
                return;
            }

            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'Timestamp',
                'Actor',
                'Email',
                'Action',
                'Record',
                'Description',
                'IP address',
                'User agent',
            ]);

            $logs->chunk(500, function ($entries) use ($handle) {
                foreach ($entries as $log) {
                    $actor = trim(($log->user?->firstname ?? '').' '.($log->user?->lastname ?? ''));

                    fputcsv($handle, [
                        $this->csvValue($log->created_at?->toDateTimeString()),
                        $this->csvValue($actor !== '' ? $actor : 'System'),
                        $this->csvValue($log->user?->email),
                        $this->csvValue($log->action),
                        $this->csvValue($log->subject_label),
                        $this->csvValue($log->description),
                        $this->csvValue($log->ip_address),
                        $this->csvValue($log->user_agent),
                    ]);
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function validateFilters(Request $request): void
    {
        $request->validate([
            'category' => ['nullable', 'in:all,changes,access'],
            'action' => ['nullable', 'string', 'max:40'],
            'subject_type' => ['nullable', 'string', 'max:255'],
            'user_id' => ['nullable', 'integer', 'min:1'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
    }

    private function filteredQuery(Request $request): Builder
    {
        return ActivityLog::query()
            ->when($request->filled('category'), function (Builder $query) use ($request) {
                $category = (string) $request->string('category');

                if ($category === 'changes') {
                    $query->whereIn('action', self::CHANGE_ACTIONS);
                } elseif ($category === 'access') {
                    $query->whereIn('action', self::ACCESS_ACTIONS);
                }
            })
            ->when($request->filled('action'), function (Builder $query) use ($request) {
                $query->where('action', (string) $request->string('action'));
            })
            ->when($request->filled('user_id'), function (Builder $query) use ($request) {
                $query->where('user_id', $request->integer('user_id'));
            })
            ->when($request->filled('subject_type'), function (Builder $query) use ($request) {
                $query->where('subject_type', (string) $request->string('subject_type'));
            })
            ->when($request->filled('from'), function (Builder $query) use ($request) {
                $query->whereDate('created_at', '>=', $request->date('from'));
            })
            ->when($request->filled('to'), function (Builder $query) use ($request) {
                $query->whereDate('created_at', '<=', $request->date('to'));
            })
            ->when($request->filled('search'), function (Builder $query) use ($request) {
                $search = '%'.(string) $request->string('search')->trim().'%';

                $query->where(function (Builder $query) use ($search) {
                    $query->where('description', 'like', $search)
                        ->orWhere('action', 'like', $search)
                        ->orWhere('ip_address', 'like', $search)
                        ->orWhereHas('user', function (Builder $query) use ($search) {
                            $query->where('firstname', 'like', $search)
                                ->orWhere('lastname', 'like', $search)
                                ->orWhere('email', 'like', $search);
                        });
                });
            });
    }

    private function csvValue(?string $value): string
    {
        $value = (string) ($value ?? '');

        return preg_match('/^[=+\-@]/', $value) === 1 ? "'".$value : $value;
    }
}
