<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{

    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'firstname',
        'lastname',
        'email',
        'phone_number',
        'password',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function phoneNumbers(): HasMany
    {
        return $this->hasMany(UserPhoneNumber::class)
            ->orderByDesc('is_primary')
            ->orderBy('id');
    }

    /**
     * Shape used by every API response that returns the signed-in account.
     *
     * @return array<int, array{id: int, phone_number: string, is_primary: bool, verified_at: ?string}>
     */
    public function phoneNumbersPayload(): array
    {
        return $this->phoneNumbers()
            ->get()
            ->map(fn (UserPhoneNumber $phone) => [
                'id' => $phone->id,
                'phone_number' => $phone->phone_number,
                'is_primary' => $phone->is_primary,
                'verified_at' => $phone->verified_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    /**
     * Full account shape used by login, profile, and phone-number responses.
     *
     * @return array<string, mixed>
     */
    public function accountPayload(): array
    {
        return [
            'id' => $this->id,
            'firstname' => $this->firstname,
            'lastname' => $this->lastname,
            'email' => $this->email,
            'phone_number' => $this->phone_number,
            'phone_numbers' => $this->phoneNumbersPayload(),
            'role' => $this->role,
        ];
    }
}
