<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduledReportExport extends Model
{
    protected $fillable = [
        'user_id',
        'email',
        'report',
        'frequency',
        'next_run_at',
        'active',
    ];

    protected $casts = [
        'next_run_at' => 'datetime',
        'active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
