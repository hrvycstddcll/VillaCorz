<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\CancellationRequest;
use App\Models\ContactSubmission;
use App\Models\PageView;
use App\Models\Payment;
use App\Models\ScheduledReportExport;
use App\Models\ServiceReview;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminReportController extends Controller
{
    public function schedules(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ScheduledReportExport::query()
                ->where('user_id', $request->user()->id)
                ->where('active', true)
                ->latest()
                ->get(['id', 'email', 'report', 'frequency', 'next_run_at']),
        ]);
    }

    public function schedule(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:254'],
            'report' => ['required', 'in:revenue,bookings,cancellations,reviews,payments,contacts,guests,traffic'],
            'frequency' => ['required', 'in:weekly,monthly'],
        ]);
        $nextRun = $validated['frequency'] === 'weekly'
            ? now()->next(Carbon::SUNDAY)->setTime(8, 0)
            : now()->addMonthNoOverflow()->startOfMonth()->setTime(8, 0);

        $schedule = ScheduledReportExport::create([
            'user_id' => $request->user()->id,
            'email' => $validated['email'],
            'report' => $validated['report'],
            'frequency' => $validated['frequency'],
            'next_run_at' => $nextRun,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Scheduled report export created.',
            'data' => $schedule->only(['id', 'email', 'report', 'frequency', 'next_run_at']),
        ], 201);
    }

    public function deleteSchedule(Request $request, int $id): JsonResponse
    {
        $schedule = ScheduledReportExport::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);
        $schedule->delete();

        return response()->json(['success' => true]);
    }

    public function scheduledCsv(string $report, string $frequency): string
    {
        $days = $frequency === 'weekly' ? 7 : 30;
        $filters = [
            'from' => now()->subDays($days - 1)->toDateString(),
            'to' => now()->toDateString(),
        ];
        $rows = $this->queryFor($report, $filters)->latest('created_at')->get();
        $stream = fopen('php://temp', 'r+');
        fputcsv($stream, ['Reference', 'Date', 'Name', 'Details', 'Status', 'Amount / rating']);

        foreach ($rows as $record) {
            $row = $this->rowFor($report, $record);
            fputcsv($stream, [
                $row['reference'],
                $row['date'],
                $row['label'],
                $row['detail'],
                $row['status'],
                $row['amount'],
            ]);
        }

        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);

        return $csv;
    }

    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'report' => ['required', 'in:revenue,bookings,cancellations,reviews,contacts,payments,guests,traffic'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'date_field' => ['nullable', 'in:check_in'],
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', 'max:24'],
        ]);

        $report = $validated['report'];
        $orderColumn = $report === 'revenue' || $report === 'payments'
            ? 'paid_at'
            : ($report === 'bookings' && ($validated['date_field'] ?? null) === 'check_in'
                ? 'check_in'
                : 'created_at');
        $rows = $this->queryFor($report, $validated)
            ->latest($orderColumn)
            ->get();
        $dateField = $validated['date_field'] ?? null;

        return response()->streamDownload(function () use ($report, $rows, $dateField) {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['Reference', 'Date', 'Name', 'Details', 'Status', 'Amount / rating']);

            foreach ($rows as $record) {
                $row = $this->rowFor($report, $record, $dateField);
                fputcsv($stream, [
                    $row['reference'],
                    $row['date'],
                    $row['label'],
                    $row['detail'],
                    $row['status'],
                    $row['amount'],
                ]);
            }

            fclose($stream);
        }, "villacorz-{$report}-".now()->format('Y-m-d').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function markContactRead(int $id): JsonResponse
    {
        $submission = \App\Models\ContactSubmission::query()->findOrFail($id);
        $submission->forceFill(['read_at' => $submission->read_at ?? now()])->save();

        return response()->json(['success' => true]);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'report' => ['required', 'in:revenue,bookings,cancellations,reviews,contacts,payments,guests,traffic'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'date_field' => ['nullable', 'in:check_in'],
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', 'max:24'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $report = $validated['report'];
        $orderColumn = $report === 'revenue' || $report === 'payments'
            ? 'paid_at'
            : ($report === 'bookings' && ($validated['date_field'] ?? null) === 'check_in'
                ? 'check_in'
                : 'created_at');
        $query = $this->queryFor($report, $validated);
        $page = $query
            ->latest($orderColumn)
            ->latest('id')
            ->paginate(min((int) ($validated['per_page'] ?? 20), 100))
            ->withQueryString();

        $rows = $page->getCollection()->map(
            fn ($record) => $this->rowFor($report, $record, $validated['date_field'] ?? null),
        );

        return response()->json([
            'success' => true,
            'data' => $rows->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'from' => $page->firstItem(),
                'to' => $page->lastItem(),
            ],
            'summary' => $this->summaryFor($report, $validated),
        ]);
    }

    /**
     * @param array<string, mixed> $filters
     */
    private function queryFor(string $report, array $filters): Builder
    {
        $query = match ($report) {
            'revenue' => Payment::query()
                ->where('status', 'paid')
                ->with('booking:id,reference,contact_name,contact_email'),
            'bookings' => Booking::query()->with('rooms:id,booking_id,service_name'),
            'cancellations' => CancellationRequest::query()
                ->with('booking:id,reference,contact_name,contact_email'),
            'reviews' => ServiceReview::query()->with('service:id,name'),
            'contacts' => ContactSubmission::query(),
            'payments' => Payment::query()->with('booking:id,reference,contact_name,contact_email'),
            'guests' => User::query()
                ->where('role', 'customer')
                ->select(['id', 'firstname', 'lastname', 'email', 'created_at']),
            'traffic' => PageView::query(),
        };

        $dateColumn = $report === 'revenue'
            ? 'paid_at'
            : ($report === 'bookings' && ($filters['date_field'] ?? null) === 'check_in'
                ? 'check_in'
                : 'created_at');
        if (! empty($filters['from'])) {
            $query->whereDate($dateColumn, '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->whereDate($dateColumn, '<=', $filters['to']);
        }

        if ($report === 'contacts' && ! empty($filters['status'])) {
            if ($filters['status'] === 'unread') {
                $query->whereNull('read_at');
            } else {
                $query->whereNotNull('read_at');
            }
        } elseif ($report === 'bookings' && ($filters['status'] ?? null) === 'check_ins') {
            $query->whereIn('status', ['confirmed', 'completed']);
        } elseif ($report === 'payments' && ($filters['status'] ?? null) === 'expired') {
            $query->where(function (Builder $paymentQuery) {
                $paymentQuery->where('status', 'expired')
                    ->orWhere(function (Builder $pendingQuery) {
                        $pendingQuery->where('status', 'pending')
                            ->whereNotNull('qr_expires_at')
                            ->where('qr_expires_at', '<', now());
                    });
            });
        } elseif (! empty($filters['status']) && in_array($report, ['bookings', 'cancellations', 'reviews', 'payments'], true)) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['search'])) {
            $term = '%'.$filters['search'].'%';
            $query->where(function (Builder $searchQuery) use ($report, $term) {
                if ($report === 'revenue' || $report === 'payments') {
                    $searchQuery->where('reference', 'like', $term)
                        ->orWhereHas('booking', fn (Builder $bookingQuery) => $bookingQuery
                            ->where('reference', 'like', $term)
                            ->orWhere('contact_name', 'like', $term)
                            ->orWhere('contact_email', 'like', $term));
                } elseif ($report === 'bookings') {
                    $searchQuery->where('reference', 'like', $term)
                        ->orWhere('contact_name', 'like', $term)
                        ->orWhere('contact_email', 'like', $term)
                        ->orWhereHas('rooms', fn (Builder $roomQuery) => $roomQuery
                            ->where('service_name', 'like', $term));
                } elseif ($report === 'cancellations') {
                    $searchQuery->where('reason', 'like', $term)
                        ->orWhereHas('booking', fn (Builder $bookingQuery) => $bookingQuery
                            ->where('reference', 'like', $term)
                            ->orWhere('contact_name', 'like', $term)
                            ->orWhere('contact_email', 'like', $term));
                } elseif ($report === 'reviews') {
                    $searchQuery->where('title', 'like', $term)
                        ->orWhere('comment', 'like', $term)
                        ->orWhereHas('service', fn (Builder $serviceQuery) => $serviceQuery->where('name', 'like', $term));
                } elseif ($report === 'guests') {
                    $searchQuery->where('firstname', 'like', $term)
                        ->orWhere('lastname', 'like', $term)
                        ->orWhere('email', 'like', $term);
                } elseif ($report === 'traffic') {
                    $searchQuery->where('path', 'like', $term)
                        ->orWhere('referrer', 'like', $term);
                } else {
                    $searchQuery->where('name', 'like', $term)
                        ->orWhere('email', 'like', $term)
                        ->orWhere('message', 'like', $term);
                }
            });
        }

        return $query;
    }

    private function rowFor(string $report, object $record, ?string $dateField = null): array
    {
        return match ($report) {
            'revenue' => [
                'id' => $record->id,
                'reference' => $record->booking?->reference ?? $record->reference,
                'date' => $record->paid_at?->toIso8601String(),
                'label' => $record->booking?->contact_name ?? 'Guest',
                'detail' => $record->method,
                'status' => $record->status,
                'amount' => (float) $record->amount,
            ],
            'bookings' => [
                'id' => $record->id,
                'reference' => $record->reference,
                'date' => ($dateField === 'check_in' ? $record->check_in : $record->created_at)?->toIso8601String(),
                'label' => $record->contact_name,
                'detail' => $record->rooms->pluck('service_name')->filter()->implode(', '),
                'status' => $record->status,
                'amount' => (float) $record->total,
            ],
            'cancellations' => [
                'id' => $record->id,
                'reference' => $record->booking?->reference ?? '—',
                'date' => $record->created_at?->toIso8601String(),
                'label' => $record->booking?->contact_name ?? 'Guest',
                'detail' => $record->reason,
                'status' => $record->status,
                'amount' => null,
            ],
            'contacts' => [
                'id' => $record->id,
                'reference' => 'MSG-'.$record->id,
                'date' => $record->created_at?->toIso8601String(),
                'label' => $record->name.' · '.$record->email,
                'detail' => $record->message,
                'status' => $record->read_at === null ? 'unread' : 'read',
                'amount' => null,
            ],
            'guests' => [
                'id' => $record->id,
                'reference' => 'USR-'.$record->id,
                'date' => $record->created_at?->toIso8601String(),
                'label' => trim($record->firstname.' '.$record->lastname),
                'detail' => $record->email,
                'status' => 'registered',
                'amount' => null,
            ],
            'traffic' => [
                'id' => $record->id,
                'reference' => 'VIEW-'.$record->id,
                'date' => $record->created_at?->toIso8601String(),
                'label' => $record->path,
                'detail' => $record->referrer ?? 'Direct visit',
                'status' => 'recorded',
                'amount' => 1,
            ],
            'payments' => [
                'id' => $record->id,
                'reference' => $record->booking?->reference ?? $record->reference,
                'date' => $record->paid_at?->toIso8601String() ?? $record->created_at?->toIso8601String(),
                'label' => $record->booking?->contact_name ?? 'Guest',
                'detail' => $record->method,
                'status' => $record->status,
                'amount' => (float) $record->amount,
            ],
            default => [
                'id' => $record->id,
                'reference' => 'REV-'.$record->id,
                'date' => $record->created_at?->toIso8601String(),
                'label' => $record->service?->name ?? 'Removed offer',
                'detail' => trim(($record->title ?? '').' '.($record->comment ?? '')),
                'status' => $record->status,
                'amount' => (int) $record->rating,
            ],
        };
    }

    /**
     * @param array<string, mixed> $filters
     * @return array{total: int, amount: float}
     */
    private function summaryFor(string $report, array $filters): array
    {
        $query = $this->queryFor($report, $filters);
        $total = (clone $query)->count();
        $amount = in_array($report, ['revenue', 'payments'], true)
            ? (float) (clone $query)->sum('amount')
            : ($report === 'bookings'
                ? (float) (clone $query)->sum('total')
                : 0.0);

        return ['total' => $total, 'amount' => $amount];
    }
}
