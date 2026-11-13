<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_rooms', function (Blueprint $table) {
            $table->id();

            $table->foreignId('booking_id')
                ->constrained('bookings')
                ->cascadeOnDelete();

            $table->foreignId('service_id')
                ->nullable()
                ->constrained('services')
                ->nullOnDelete();

            // Snapshots keep old reservations readable even if the offer is
            // edited or deleted later.
            $table->string('service_name');
            $table->string('kind', 20)->default('room');

            $table->unsignedSmallInteger('adults')->default(1);
            $table->unsignedSmallInteger('kids')->default(0);

            $table->decimal('weekday_price', 10, 2);
            $table->decimal('weekend_price', 10, 2);
            $table->decimal('line_total', 10, 2);

            $table->timestamps();

            $table->unique(['booking_id', 'service_id']);
            $table->index('service_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_rooms');
    }
};
