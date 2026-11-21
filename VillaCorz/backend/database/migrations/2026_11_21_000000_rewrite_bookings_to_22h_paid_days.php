<?php

use App\Support\StayPolicy;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addBackupColumns();
        DB::transaction(fn () => $this->rewriteBookings());
    }

    public function down(): void
    {
        DB::transaction(fn () => $this->restoreBookings());
        $this->dropBackupColumns();
    }

    private function addBackupColumns(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->unsignedSmallInteger('paid_days')
                ->nullable()
                ->after('nights');
            $table->dateTime('legacy_check_out')
                ->nullable()
                ->after('paid_days');
            $table->unsignedSmallInteger('legacy_nights')
                ->nullable()
                ->after('legacy_check_out');
            $table->decimal('legacy_subtotal', 10, 2)
                ->nullable()
                ->after('legacy_nights');
            $table->decimal('legacy_total', 10, 2)
                ->nullable()
                ->after('legacy_subtotal');
        });

        Schema::table('booking_rooms', function (Blueprint $table) {
            $table->decimal('legacy_line_total', 10, 2)
                ->nullable()
                ->after('line_total');
            $table->decimal('legacy_additional_head_total', 10, 2)
                ->nullable()
                ->after('legacy_line_total');
        });
    }

    private function rewriteBookings(): void
    {
        $hasPayments = Schema::hasTable('payments');

        DB::table('bookings')
            ->orderBy('id')
            ->chunkById(100, function (Collection $bookings) use ($hasPayments) {
                foreach ($bookings as $booking) {
                    $paidDays = StayPolicy::paidDaysFor($booking->check_in, $booking->check_out);
                    $checkOut = StayPolicy::checkOutFor($booking->check_in, $paidDays);
                    $windows = StayPolicy::windows($booking->check_in, $paidDays);

                    $subtotal = 0.0;
                    $rooms = DB::table('booking_rooms')
                        ->where('booking_id', $booking->id)
                        ->orderBy('id')
                        ->get();

                    foreach ($rooms as $room) {
                        $lineTotal = 0.0;
                        $additionalHeadTotal = 0.0;
                        $additionalHeads = (int) ($room->additional_heads ?? 0);

                        foreach ($windows as $window) {
                            $isWeekend = (bool) $window['is_weekend'];
                            $dayPrice = (float) ($isWeekend
                                ? $room->weekend_price
                                : $room->weekday_price);
                            $headPrice = (float) ($isWeekend
                                ? ($room->additional_head_weekend_price ?? 0)
                                : ($room->additional_head_weekday_price ?? 0));
                            $dayHeadTotal = $additionalHeads * $headPrice;

                            $lineTotal += $dayPrice + $dayHeadTotal;
                            $additionalHeadTotal += $dayHeadTotal;
                        }

                        $lineTotal = round($lineTotal, 2);
                        $additionalHeadTotal = round($additionalHeadTotal, 2);
                        $subtotal += $lineTotal;

                        DB::table('booking_rooms')
                            ->where('id', $room->id)
                            ->update([
                                'legacy_line_total' => $room->line_total,
                                'legacy_additional_head_total' => $room->additional_head_total,
                                'line_total' => $lineTotal,
                                'additional_head_total' => $additionalHeadTotal,
                            ]);
                    }

                    $subtotal = round($subtotal, 2);

                    DB::table('bookings')
                        ->where('id', $booking->id)
                        ->update([
                            'paid_days' => $paidDays,
                            'nights' => $paidDays,
                            'legacy_check_out' => $booking->check_out,
                            'legacy_nights' => $booking->nights,
                            'legacy_subtotal' => $booking->subtotal,
                            'legacy_total' => $booking->total,
                            'check_out' => $checkOut->utc()->toDateTimeString(),
                            'subtotal' => $subtotal,
                            'total' => $subtotal,
                        ]);

                    if ($hasPayments) {
                        DB::table('payments')
                            ->where('booking_id', $booking->id)
                            ->update(['amount' => $subtotal]);
                    }
                }
            });
    }

    private function restoreBookings(): void
    {
        $hasPayments = Schema::hasTable('payments');

        DB::table('booking_rooms')
            ->whereNotNull('legacy_line_total')
            ->orderBy('id')
            ->chunkById(100, function (Collection $rooms) {
                foreach ($rooms as $room) {
                    DB::table('booking_rooms')
                        ->where('id', $room->id)
                        ->update([
                            'line_total' => $room->legacy_line_total,
                            'additional_head_total' => $room->legacy_additional_head_total ?? 0,
                        ]);
                }
            });

        DB::table('bookings')
            ->orderBy('id')
            ->chunkById(100, function (Collection $bookings) use ($hasPayments) {
                foreach ($bookings as $booking) {
                    $restored = [];

                    if ($booking->legacy_check_out !== null) {
                        $restored['check_out'] = $booking->legacy_check_out;
                    }
                    if ($booking->legacy_nights !== null) {
                        $restored['nights'] = $booking->legacy_nights;
                    }
                    if ($booking->legacy_subtotal !== null) {
                        $restored['subtotal'] = $booking->legacy_subtotal;
                    }
                    if ($booking->legacy_total !== null) {
                        $restored['total'] = $booking->legacy_total;
                    }

                    if ($restored !== []) {
                        DB::table('bookings')
                            ->where('id', $booking->id)
                            ->update($restored);
                    }

                    if ($hasPayments && $booking->legacy_total !== null) {
                        DB::table('payments')
                            ->where('booking_id', $booking->id)
                            ->update(['amount' => $booking->legacy_total]);
                    }
                }
            });
    }

    private function dropBackupColumns(): void
    {
        Schema::table('booking_rooms', function (Blueprint $table) {
            $table->dropColumn([
                'legacy_line_total',
                'legacy_additional_head_total',
            ]);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'paid_days',
                'legacy_check_out',
                'legacy_nights',
                'legacy_subtotal',
                'legacy_total',
            ]);
        });
    }
};
