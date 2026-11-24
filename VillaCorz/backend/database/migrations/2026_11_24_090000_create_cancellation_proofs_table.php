<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cancellation_proofs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('cancellation_request_id')
                ->constrained('cancellation_requests')
                ->cascadeOnDelete();

            $table->string('path')->unique();
            $table->string('original_name');
            $table->string('mime', 100)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->longText('contents');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cancellation_proofs');
    }
};
