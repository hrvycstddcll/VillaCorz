<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PageView extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'path',
        'session_hash',
        'referrer',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
