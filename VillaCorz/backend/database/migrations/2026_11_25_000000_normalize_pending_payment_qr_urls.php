<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('payments')
            ->where('status', 'pending')
            ->where('qr_url', 'like', 'https://villacorz-api.onrender.com/pay/%')
            ->update([
                'qr_url' => DB::raw("REPLACE(qr_url, 'https://villacorz-api.onrender.com', 'https://villa-corz.vercel.app')"),
            ]);
    }

    public function down(): void
    {
        DB::table('payments')
            ->where('status', 'pending')
            ->where('qr_url', 'like', 'https://villa-corz.vercel.app/pay/%')
            ->update([
                'qr_url' => DB::raw("REPLACE(qr_url, 'https://villa-corz.vercel.app', 'https://villacorz-api.onrender.com')"),
            ]);
    }
};
