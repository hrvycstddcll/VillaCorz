<?php

use App\Support\PhoneNumber;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Rewrite legacy free-text phone numbers into the canonical E.164 shape.
     * Values that cannot be parsed are left untouched rather than deleted.
     */
    public function up(): void
    {
        DB::table('user_phone_numbers')
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    $normalized = PhoneNumber::tryNormalize($row->phone_number);

                    if ($normalized === null || $normalized === $row->phone_number) {
                        continue;
                    }

                    $duplicate = DB::table('user_phone_numbers')
                        ->where('user_id', $row->user_id)
                        ->where('phone_number', $normalized)
                        ->where('id', '!=', $row->id)
                        ->first();

                    if ($duplicate) {
                        if ($row->is_primary || $row->verified_at) {
                            DB::table('user_phone_numbers')
                                ->where('id', $duplicate->id)
                                ->update([
                                    'is_primary' => $duplicate->is_primary || $row->is_primary,
                                    'verified_at' => $duplicate->verified_at ?? $row->verified_at,
                                    'updated_at' => now(),
                                ]);
                        }

                        DB::table('user_phone_numbers')->where('id', $row->id)->delete();

                        continue;
                    }

                    DB::table('user_phone_numbers')
                        ->where('id', $row->id)
                        ->update([
                            'phone_number' => $normalized,
                            'updated_at' => now(),
                        ]);
                }
            });

        DB::table('users')
            ->orderBy('id')
            ->chunkById(200, function ($users) {
                foreach ($users as $user) {
                    $primary = DB::table('user_phone_numbers')
                        ->where('user_id', $user->id)
                        ->orderByDesc('is_primary')
                        ->orderBy('id')
                        ->first();

                    $phone = $primary?->phone_number
                        ?? PhoneNumber::tryNormalize($user->phone_number);

                    if ($phone !== null && $phone !== $user->phone_number) {
                        DB::table('users')
                            ->where('id', $user->id)
                            ->update(['phone_number' => $phone]);
                    }
                }
            });
    }

    public function down(): void
    {
        // Normalization is not reversible; the previous free-text values are
        // not retained.
    }
};