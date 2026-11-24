<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

class CancellationProof extends Model
{
    protected $fillable = [
        'cancellation_request_id',
        'path',
        'original_name',
        'mime',
        'size',
        'contents',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    public function cancellationRequest(): BelongsTo
    {
        return $this->belongsTo(CancellationRequest::class);
    }

    protected function contents(): Attribute
    {
        return Attribute::make(
            get: fn (?string $value): ?string => $value === null
                ? null
                : (base64_decode($value, true) ?: ''),
            set: fn (?string $value): ?string => $value === null ? null : base64_encode($value),
        );
    }

    public function writeTemporaryFile(): string
    {
        $path = tempnam(sys_get_temp_dir(), 'vc-proof-');

        if ($path === false || file_put_contents($path, $this->contents) === false) {
            throw new RuntimeException('Unable to prepare the cancellation proof attachment.');
        }

        return $path;
    }
}
