<?php

namespace App\Rules;

use App\Support\PhoneNumber;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PhoneNumberRule implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || PhoneNumber::tryNormalize($value) === null) {
            $fail('Enter a valid phone number (e.g. 0917 123 4567 or +63 917 123 4567).');
        }
    }
}