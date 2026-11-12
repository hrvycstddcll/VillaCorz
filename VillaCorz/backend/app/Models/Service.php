<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    protected $fillable = [
        'created_by',
        'kind',
        'name',
        'description',
        'price',
        'weekend_price',
        'weekday_discount_type',
        'weekday_discount_value',
        'weekend_discount_type',
        'weekend_discount_value',
        'pax',
        'features',
        'amenities',
        'status',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'weekend_price' => 'decimal:2',
        'weekday_discount_value' => 'decimal:2',
        'weekend_discount_value' => 'decimal:2',
        'pax' => 'integer',
        'features' => 'array',
        'amenities' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ServiceImage::class)
            ->orderByDesc('is_primary')
            ->orderBy('sort_order')
            ->orderBy('id');
    }
}
