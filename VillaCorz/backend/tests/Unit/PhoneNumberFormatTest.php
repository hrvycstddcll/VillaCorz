<?php

namespace Tests\Unit;

use App\Support\PhoneNumber;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class PhoneNumberFormatTest extends TestCase
{
    #[DataProvider('phMobileFormats')]
    public function test_local_formats_convert_to_ph_mobile_e164(string $input): void
    {
        $this->assertSame('+639171234567', PhoneNumber::normalize($input));
    }

    /**
     * @return array<int, array{0: string}>
     */
    public static function phMobileFormats(): array
    {
        return [
            ['09171234567'],
            ['0917 123 4567'],
            ['0917-123-4567'],
            ['(0917) 123-4567'],
            ['9171234567'],
            ['63 917 123 4567'],
            ['+63 917 123 4567'],
            ['+639171234567'],
            ['00639171234567'],
        ];
    }

    public function test_explicit_international_numbers_are_kept_in_e164(): void
    {
        $this->assertSame('+14155550132', PhoneNumber::normalize('+1 (415) 555-0132'));
        $this->assertSame('+14155550132', PhoneNumber::normalize('001 415 555 0132'));
    }

    public function test_empty_values_are_treated_as_missing(): void
    {
        $this->assertNull(PhoneNumber::normalize(null));
        $this->assertNull(PhoneNumber::normalize(''));
        $this->assertNull(PhoneNumber::normalize('   '));
    }

    public function test_invalid_numbers_are_rejected(): void
    {
        $invalid = [
            'abc',
            '12345',
            '0917123456',
            '+63 123 456 7890',
            '+63 2 8123 4567',
            '+63 917 123 4567 999',
        ];

        foreach ($invalid as $value) {
            $this->assertNull(PhoneNumber::tryNormalize($value), "\"{$value}\" should be invalid.");
        }
    }

    public function test_invalid_numbers_throw_when_normalized_directly(): void
    {
        $this->expectException(InvalidArgumentException::class);

        PhoneNumber::normalize('12345');
    }

    public function test_numbers_are_formatted_for_display(): void
    {
        $this->assertSame('+63 917 123 4567', PhoneNumber::format('0917 123 4567'));
        $this->assertSame('+63 917 123 4567', PhoneNumber::format('+639171234567'));
        $this->assertSame('+14155550132', PhoneNumber::format('+1 415 555 0132'));
        $this->assertSame('not-a-number', PhoneNumber::format('not-a-number'));
    }
}