<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('weekday_discount_type', 20)->nullable()->after('price');
            $table->decimal('weekday_discount_value', 10, 2)->nullable()->after('weekday_discount_type');
            $table->string('weekend_discount_type', 20)->nullable()->after('weekday_discount_value');
            $table->decimal('weekend_discount_value', 10, 2)->nullable()->after('weekend_discount_type');
        });

        DB::table('services')->update([
            'weekday_discount_type' => DB::raw('discount_type'),
            'weekday_discount_value' => DB::raw('discount_value'),
            'weekend_discount_type' => DB::raw('discount_type'),
            'weekend_discount_value' => DB::raw('discount_value'),
        ]);

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['discount_type', 'discount_value']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('discount_type', 20)->nullable()->after('price');
            $table->decimal('discount_value', 10, 2)->nullable()->after('discount_type');
        });

        DB::table('services')->update([
            'discount_type' => DB::raw('weekday_discount_type'),
            'discount_value' => DB::raw('weekday_discount_value'),
        ]);

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn([
                'weekday_discount_type',
                'weekday_discount_value',
                'weekend_discount_type',
                'weekend_discount_value',
            ]);
        });
    }
};
