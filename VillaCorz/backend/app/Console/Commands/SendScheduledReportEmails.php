<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\AdminReportController;
use App\Mail\AdminReportExport;
use App\Models\ScheduledReportExport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendScheduledReportEmails extends Command
{
    protected $signature = 'reports:send-scheduled';

    protected $description = 'Send due scheduled report CSV exports to administrators';

    public function handle(AdminReportController $reports): int
    {
        $failed = false;
        $schedules = ScheduledReportExport::query()
            ->where('active', true)
            ->where('next_run_at', '<=', now())
            ->orderBy('id')
            ->get();

        foreach ($schedules as $schedule) {
            try {
                $csv = $reports->scheduledCsv($schedule->report, $schedule->frequency);
                $filename = "villacorz-{$schedule->report}-".now()->format('Y-m-d').'.csv';
                Mail::to($schedule->email)->send(new AdminReportExport(
                    report: $schedule->report,
                    frequency: $schedule->frequency,
                    csv: $csv,
                    filename: $filename,
                ));

                $nextRun = $schedule->frequency === 'weekly'
                    ? $schedule->next_run_at->copy()->addWeek()
                    : $schedule->next_run_at->copy()->addMonthNoOverflow();
                $schedule->update(['next_run_at' => $nextRun]);
            } catch (Throwable $exception) {
                $failed = true;
                Log::error('Scheduled report export could not be sent.', [
                    'schedule_id' => $schedule->id,
                    'exception' => $exception,
                ]);
                $this->error("Unable to send scheduled report {$schedule->id}.");
            }
        }

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
