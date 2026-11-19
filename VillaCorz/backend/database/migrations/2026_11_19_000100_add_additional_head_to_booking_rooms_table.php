<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_rooms', function (Blueprint $table) {
            $table->unsignedSmallInteger('additional_heads')
                ->default(0)
                ->after('kids');

            $table->decimal('additional_head_weekday_price', 10, 2)
                ->default(0)
                ->after('weekend_price');

            $table->decimal('additional_head_weekend_price', 10, 2)
                ->default(0)
                ->after('additional_head_weekday_price');

            $table->decimal('additional_head_total', 10, 2)
                ->default(0)
                ->after('additional_head_weekend_price');
        });
    }

    public function down(): void
    {
        Schema::table('booking_rooms', function (Blueprint $table) {
            $table->dropColumn([
                'additional_heads',
                'additional_head_weekday_price',
                'additional_head_weekend_price',
                'additional_head_total',
            ]);
        });
    }
};
