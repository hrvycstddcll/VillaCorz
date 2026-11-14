<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_reviews', function (Blueprint $table) {
            $table->id();

            $table->foreignId('service_id')
                ->constrained('services')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('booking_id')
                ->nullable()
                ->constrained('bookings')
                ->nullOnDelete();

            $table->unsignedTinyInteger('rating');
            $table->string('title', 120)->nullable();
            $table->text('comment')->nullable();

            $table->string('status', 20)->default('published');

            $table->timestamps();

            $table->unique(['user_id', 'service_id']);
            $table->index(['service_id', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_reviews');
    }
};
