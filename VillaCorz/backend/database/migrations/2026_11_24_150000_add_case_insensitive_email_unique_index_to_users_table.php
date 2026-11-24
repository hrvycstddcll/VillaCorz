<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE UNIQUE INDEX users_email_lower_unique ON users (LOWER(email))');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX users_email_lower_unique');
    }
};
