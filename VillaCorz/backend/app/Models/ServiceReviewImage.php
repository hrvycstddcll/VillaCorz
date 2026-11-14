<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceReviewImage extends Model
{
    protected $fillable = [
        'service_review_id',
        'image_url',
        'public_id',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function review(): BelongsTo
    {
        return $this->belongsTo(ServiceReview::class, 'service_review_id');
    }
}
