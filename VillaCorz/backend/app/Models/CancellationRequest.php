<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CancellationRequest extends Model
{
    protected $fillable = [
        'booking_id',
        'user_id',
        'reason',
        'proof_path',
        'proof_original_name',
        'status',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function proof(): HasOne
    {
        return $this->hasOne(CancellationProof::class);
    }
}
