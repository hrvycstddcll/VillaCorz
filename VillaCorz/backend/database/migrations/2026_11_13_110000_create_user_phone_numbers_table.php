<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_phone_numbers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('phone_number', 32);
            $table->boolean('is_primary')->default(false);
            $table->timestamp('verified_at')->nullable();

            $table->timestamps();

            $table->unique(['user_id', 'phone_number']);
            $table->index(['user_id', 'is_primary']);
        });

        // Preserve every phone number that was already saved on the account
        // before multiple numbers existed.
        DB::table('users')
            ->whereNotNull('phone_number')
            ->where('phone_number', '!=', '')
            ->orderBy('id')
            ->chunk(100, function ($users) {
                foreach ($users as $user) {
                    DB::table('user_phone_numbers')->insertOrIgnore([
                        'user_id' => $user->id,
                        'phone_number' => $user->phone_number,
                        'is_primary' => true,
                        'verified_at' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_phone_numbers');
    }
};