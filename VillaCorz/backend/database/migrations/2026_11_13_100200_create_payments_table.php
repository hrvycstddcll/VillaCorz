<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('booking_id')
                ->constrained('bookings')
                ->cascadeOnDelete();

            $table->string('reference', 40)->unique();
            $table->string('provider', 20)->default('demo');
            $table->string('method', 40);
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('PHP');
            $table->string('status', 20)->default('pending');

            // A retried payment request must resolve to the same payment row.
            $table->string('idempotency_key', 64)->nullable()->unique();

            // The QR embeds a random token. Only its hash is stored so a
            // database leak cannot be used to confirm payments.
            $table->string('qr_token_hash', 64)->unique();
            $table->string('qr_url', 2048);
            $table->timestamp('qr_expires_at')->nullable();

            $table->timestamp('paid_at')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->index(['booking_id', 'status']);
            $table->index(['status', 'qr_expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
