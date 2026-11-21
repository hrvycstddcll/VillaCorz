<?php

namespace App\Console\Commands;

use App\Models\Payment;
use Database\Seeders\DemoCleanReseedSeeder;
use Illuminate\Console\Command;

class DemoReseedClean extends Command
{
    protected $signature = 'demo:reseed-clean';

    protected $description = 'Reset demo transactions while preserving accounts, services, and reviews';

    public function handle(): int
    {
        $this->call('db:seed', [
            '--class' => DemoCleanReseedSeeder::class,
            '--force' => true,
        ]);

        $revenue = (float) Payment::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [
                now()->startOfDay()->subDays(29),
                now()->endOfDay(),
            ])
            ->sum('amount');

        $this->info('Clean reseed complete.');
        $this->line('Rolling 30-day paid revenue: PHP '.number_format($revenue, 2));

        return self::SUCCESS;
    }
}
