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
        'weekday_price',
        'weekend_price',
        'line_total',
    ];

    protected $casts = [
        'adults' => 'integer',
        'kids' => 'integer',
        'weekday_price' => 'decimal:2',
        'weekend_price' => 'decimal:2',
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
