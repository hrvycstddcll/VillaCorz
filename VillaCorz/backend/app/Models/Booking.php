<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    protected $fillable = [
        'user_id',
        'reference',
        'contact_name',
        'contact_email',
        'contact_phone',
        'check_in',
        'check_out',
        'nights',
        'adults',
        'kids',
        'subtotal',
        'total',
        'currency',
        'status',
        'payment_method',
        'expires_at',
        'confirmed_at',
        'confirmation_email_sent_at',
        'idempotency_key',
        'request_hash',
    ];

    protected $casts = [
        'check_in' => 'date',
        'check_out' => 'date',
        'nights' => 'integer',
        'adults' => 'integer',
        'kids' => 'integer',
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'expires_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'confirmation_email_sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(BookingRoom::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    public function events(): HasMany
    {
        return $this->hasMany(PaymentEvent::class);
    }

    public function cancellationRequests(): HasMany
    {
        return $this->hasMany(CancellationRequest::class);
    }

    public function latestCancellationRequest(): HasOne
    {
        return $this->hasOne(CancellationRequest::class)->latestOfMany();
    }

    public function isPendingPayment(): bool
    {
        return $this->status === 'pending_payment';
    }

    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed';
    }
}
