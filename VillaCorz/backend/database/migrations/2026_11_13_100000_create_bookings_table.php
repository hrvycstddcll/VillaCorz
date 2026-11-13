<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('reference', 40)->unique();
            $table->string('contact_name');
            $table->string('contact_email');
            $table->string('contact_phone', 32)->nullable();

            $table->date('check_in');
            $table->date('check_out');
            $table->unsignedSmallInteger('nights');
            $table->unsignedSmallInteger('adults')->default(0);
            $table->unsignedSmallInteger('kids')->default(0);

            $table->decimal('subtotal', 10, 2);
            $table->decimal('total', 10, 2);
            $table->string('currency', 3)->default('PHP');

            $table->string('status', 30)->default('pending_payment');
            $table->string('payment_method', 40)->nullable();

            $table->timestamp('expires_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('confirmation_email_sent_at')->nullable();

            // Idempotency support: a retried request must not create a second booking.
            $table->string('idempotency_key', 64)->nullable()->unique();
            $table->string('request_hash', 64)->nullable();

            $table->timestamps();

            $table->index(['status', 'expires_at']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
