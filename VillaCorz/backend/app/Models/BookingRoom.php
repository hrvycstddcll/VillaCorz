<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingRoom extends Model
{
    protected $fillable = [
        'booking_id',
        'service_id',
        'service_name',
        'kind',
        'adults',
        'kids',
        'additional_heads',
        'weekday_price',
        'weekend_price',
        'additional_head_weekday_price',
        'additional_head_weekend_price',
        'additional_head_total',
        'line_total',
    ];

    protected $casts = [
        'adults' => 'integer',
        'kids' => 'integer',
        'additional_heads' => 'integer',
        'weekday_price' => 'decimal:2',
        'weekend_price' => 'decimal:2',
        'additional_head_weekday_price' => 'decimal:2',
        'additional_head_weekend_price' => 'decimal:2',
        'additional_head_total' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
