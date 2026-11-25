<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PendingRegistration extends Model
{
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'email',
        'firstname',
        'lastname',
        'password',
        'otp_hash',
        'attempts',
        'expires_at',
        'last_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'expires_at' => 'datetime',
            'last_sent_at' => 'datetime',
        ];
    }
}
