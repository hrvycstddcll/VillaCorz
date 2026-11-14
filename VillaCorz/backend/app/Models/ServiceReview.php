<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceReview extends Model
{
    protected $fillable = [
        'service_id',
        'user_id',
        'booking_id',
        'rating',
        'title',
        'comment',
        'status',
    ];

    protected $casts = [
        'rating' => 'integer',
    ];

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ServiceReviewImage::class)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function isVerified(): bool
    {
        return $this->booking !== null
            && $this->booking->status === 'confirmed'
            && $this->booking->check_out !== null
            && $this->booking->check_out->isPast();
    }
}
