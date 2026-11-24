<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Service;
use App\Services\VillaRoomConflictResolver;
use App\Support\StayPolicy;
use App\Support\StayTime;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResolveVillaRoomConflicts extends Command
{
    protected $signature = 'bookings:resolve-villa-room-conflicts
        {--from= : First check-out date to reconcile in PHT (Y-m-d). Defaults to today.}
        {--dry-run : Report conflicts without cancelling anything.}';

    protected $description = 'Cancel room bookings that conflict with whole-villa stays, prioritizing the villa';

    public function handle(VillaRoomConflictResolver $resolver): int
    {
        $from = $this->resolveFrom();

        if ($from === null) {
            return self::FAILURE;
        }

        $exclusiveServiceId = Service::query()
            ->where('kind', 'exclusive')
            ->value('id');

        if ($exclusiveServiceId === null) {
            $this->warn('No exclusive whole-villa service is configured.');

            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        $turnoverHours = StayPolicy::turnoverHours();
        $villas = Booking::query()
            ->where('status', 'confirmed')
            ->whereHas(
                'rooms',
                fn ($roomQuery) => $roomQuery->where('service_id', $exclusiveServiceId),
            )
            ->whereRaw(
                'DATE_ADD(bookings.check_out, INTERVAL ? HOUR) > ?',
                [$turnoverHours, $from->toDateTimeString()],
            )
            ->with('rooms')
            ->orderBy('check_in')
            ->get();

        $total = 0;

        foreach ($villas as $villa) {
            if ($dryRun) {
                $conflicts = $resolver->conflicts($villa, $from);

                foreach ($conflicts as $roomBooking) {
                    $total++;
                    $this->line($this->describeConflict($villa, $roomBooking, 'Would cancel'));
                }

                continue;
            }

            $cancelled = DB::transaction(function () use ($resolver, $villa, $from): int {
                $conflicts = $resolver->conflicts($villa, $from, true);

                foreach ($conflicts as $roomBooking) {
                    $resolver->cancelRoomBooking($villa, $roomBooking, 'system');
                }

                return $conflicts->count();
            });

            $total += $cancelled;
        }

        if ($dryRun) {
            $this->info("Dry run complete. {$total} conflicting room booking(s) would be cancelled.");
        } else {
            $this->info("Reconciliation complete. {$total} conflicting room booking(s) cancelled.");
        }

        return self::SUCCESS;
    }

    private function resolveFrom(): ?CarbonImmutable
    {
        $option = $this->option('from');

        if ($option === null || $option === '') {
            return CarbonImmutable::now(StayTime::TIMEZONE)->startOfDay()->utc();
        }

        $parsed = CarbonImmutable::createFromFormat(
            '!Y-m-d',
            (string) $option,
            StayTime::TIMEZONE,
        );

        if ($parsed === false || $parsed->format('Y-m-d') !== $option) {
            $this->error('The --from option must be a valid date in Y-m-d format.');

            return null;
        }

        return $parsed->utc();
    }

    private function describeConflict(Booking $villa, Booking $roomBooking, string $prefix): string
    {
        $roomNames = $roomBooking->rooms
            ->pluck('service_name')
            ->filter()
            ->implode(', ');

        return sprintf(
            '%s room booking %s (%s) for villa %s (%s -> %s).',
            $prefix,
            $roomBooking->reference,
            $roomNames !== '' ? $roomNames : 'private room',
            $villa->reference,
            StayTime::formatPht($villa->check_in),
            StayTime::formatPht($villa->check_out),
        );
    }
}
