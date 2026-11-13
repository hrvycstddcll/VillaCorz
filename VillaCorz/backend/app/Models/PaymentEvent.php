<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\Request;

class PaymentEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'booking_id',
        'payment_id',
        'event',
        'actor',
        'idempotency_key',
        'metadata',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * Record a transaction event without interrupting the payment flow.
     */
    public static function record(
        string $event,
        ?Payment $payment = null,
        ?Booking $booking = null,
        string $actor = 'system',
        array $metadata = [],
        ?string $idempotencyKey = null,
        ?Request $request = null,
    ): ?self {
        try {
            $booking ??= $payment?->booking;

            return self::create([
                'booking_id' => $booking?->id,
                'payment_id' => $payment?->id,
                'event' => $event,
                'actor' => $actor,
                'idempotency_key' => $idempotencyKey,
                'metadata' => $metadata ?: null,
                'ip_address' => $request?->ip(),
                'user_agent' => $request?->userAgent(),
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            return null;
        }
    }
}
