<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Payment extends Model
{
    protected $fillable = [
        'booking_id',
        'reference',
        'provider',
        'method',
        'amount',
        'currency',
        'status',
        'idempotency_key',
        'qr_token_hash',
        'qr_url',
        'qr_expires_at',
        'paid_at',
        'metadata',
    ];

    protected $hidden = [
        'qr_token_hash',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'qr_expires_at' => 'datetime',
        'paid_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(PaymentEvent::class);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    public function isExpired(): bool
    {
        if ($this->status === 'expired') {
            return true;
        }

        if ($this->status !== 'pending') {
            return false;
        }

        return $this->qr_expires_at !== null
            && $this->qr_expires_at->isPast();
    }

    public function markExpired(): void
    {
        if ($this->status !== 'pending') {
            return;
        }

        $this->forceFill(['status' => 'expired'])->save();

        $this->booking?->update(['status' => 'expired']);
    }

    /**
     * Human-readable payment reference, kept separate from the booking code.
     */
    public static function makeReference(): string
    {
        return 'PAY-'.strtoupper(bin2hex(random_bytes(4)));
    }

    /**
     * Re-host the stored QR link under the currently configured public URL.
     *
     * The random token lives in the path, so the origin can change (for
     * example from localhost to a LAN IP for a phone demo) without issuing a
     * new QR code or storing the raw token anywhere.
     */
    public function publicQrUrl(): string
    {
        $stored = (string) $this->qr_url;
        $origin = rtrim((string) config('payments.public_url'), '/');

        if ($stored === '' || $origin === '') {
            return $stored;
        }

        $path = parse_url($stored, PHP_URL_PATH);

        if (! is_string($path) || $path === '') {
            return $stored;
        }

        $query = parse_url($stored, PHP_URL_QUERY);
        $suffix = is_string($query) && $query !== '' ? '?'.$query : '';

        return $origin.$path.$suffix;
    }

    public static function makeQrExpiry(): Carbon
    {
        return now()->addMinutes((int) config('payments.qr_ttl_minutes', 60));
    }
}
