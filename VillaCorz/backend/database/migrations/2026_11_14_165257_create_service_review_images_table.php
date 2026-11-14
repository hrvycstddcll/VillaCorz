<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_review_images', function (Blueprint $table) {
            $table->id();

            $table->foreignId('service_review_id')
                ->constrained('service_reviews')
                ->cascadeOnDelete();

            $table->text('image_url');
            $table->string('public_id')->nullable();

            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index('service_review_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_review_images');
    }
};
