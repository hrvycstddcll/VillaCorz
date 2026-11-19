<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->decimal('additional_head_weekday_price', 10, 2)
                ->default(50)
                ->after('weekend_price');

            $table->decimal('additional_head_weekend_price', 10, 2)
                ->default(100)
                ->after('additional_head_weekday_price');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn([
                'additional_head_weekday_price',
                'additional_head_weekend_price',
            ]);
        });
    }
};
