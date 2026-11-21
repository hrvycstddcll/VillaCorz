<?php

use App\Support\StayTime;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dateTime('check_in')->change();
            $table->dateTime('check_out')->change();
        });

        DB::table('bookings')
            ->orderBy('id')
            ->chunkById(100, function (Collection $bookings) {
                foreach ($bookings as $booking) {
                    DB::table('bookings')->where('id', $booking->id)->update([
                        'check_in' => StayTime::parseApi((string) $booking->check_in)->toDateTimeString(),
                        'check_out' => StayTime::parseApi((string) $booking->check_out)->toDateTimeString(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        DB::table('bookings')->update([
            'check_in' => DB::raw('DATE(check_in)'),
            'check_out' => DB::raw('DATE(check_out)'),
        ]);

        Schema::table('bookings', function (Blueprint $table) {
            $table->date('check_in')->change();
            $table->date('check_out')->change();
        });
    }
};
