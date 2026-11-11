<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Throwable;

class ActivityLogger
{
    /**
     * Record an auditable event without interrupting the request it describes.
     */
    public static function record(
        string $action,
        ?User $actor = null,
        ?string $description = null,
        ?string $subjectType = null,
        int|string|null $subjectId = null,
        array $properties = [],
        ?Request $request = null,
    ): ?ActivityLog {
        try {
            $request ??= request();

            return ActivityLog::create([
                'user_id' => $actor?->id,
                'action' => $action,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'description' => $description,
                'properties' => $properties ?: null,
                'ip_address' => $request?->ip(),
                'user_agent' => $request?->userAgent(),
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return null;
        }
    }
}
