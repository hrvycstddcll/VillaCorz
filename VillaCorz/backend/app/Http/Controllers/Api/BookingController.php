<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\PaymentEvent;
use App\Models\Service;
use App\Rules\PhoneNumberRule;
use App\Services\ActivityLogger;
use App\Services\BookingAvailability;
use App\Services\PricingService;
use App\Mail\CancellationRequestMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use App\Support\PhoneNumber;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'all');

        $query = Booking::query()
            ->where('user_id', $request->user()->id)
            ->with(['rooms.service.images', 'payment', 'latestCancellationRequest'])
            ->latest();

        if ($status !== 'all' && $status !== null && $status !== '') {
            if ($status === 'booked') {
                $query->where('status', 'confirmed')
                    ->whereDate('check_out', '>=', now()->toDateString());
            } elseif ($status === 'completed') {
                $query->where('status', 'confirmed')
                    ->whereDate('check_out', '<', now()->toDateString());
            } elseif ($status === 'cancelled') {
                $query->where('status', 'cancelled');
            } elseif (in_array($status, ['pending_payment', 'expired', 'confirmed'], true)) {
                $query->where('status', $status);
            }
        }

        $bookings = $query->get();

        return response()->json([
            'success' => true,
            'data' => $bookings->map(fn (Booking $booking) => $this->bookingPayload($booking))->values(),
        ]);
    }

    public function show(Request $request, string $reference): JsonResponse
    {
        $booking = Booking::query()
            ->where('reference', $reference)
            ->with(['rooms.service.images', 'payment', 'latestCancellationRequest'])
            ->firstOrFail();

        $this->authorizeOwner($request, $booking);

        return response()->json([
            'success' => true,
            'data' => $this->bookingPayload($booking),
        ]);
    }

    public function store(
        Request $request,
        PricingService $pricing,
        BookingAvailability $availability,
    ): JsonResponse {
        $validated = $request->validate([
            'check_in' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'check_out' => ['required', 'date_format:Y-m-d', 'after:check_in'],
            'rooms' => ['required', 'array', 'min:1', 'max:10'],
            'rooms.*.service_id' => ['required', 'integer', 'exists:services,id'],
            'rooms.*.adults' => ['required', 'integer', 'min:1', 'max:60'],
            'rooms.*.kids' => ['nullable', 'integer', 'min:0', 'max:60'],
            'contact_name' => ['required', 'string', 'max:120'],
            'contact_email' => ['required', 'email', 'max:254'],
            'contact_phone' => ['required', 'string', 'max:32', new PhoneNumberRule()],
            'payment_method' => ['required', 'string', 'max:40'],
        ]);

        // Store the canonical E.164 value so formatting differences do not
        // create duplicate-looking records or different idempotency hashes.
        $contactPhone = PhoneNumber::normalize($validated['contact_phone']);

        $roomsInput = collect($validated['rooms'])
            ->map(fn (array $room) => [
                'service_id' => (int) $room['service_id'],
                'adults' => (int) $room['adults'],
                'kids' => (int) ($room['kids'] ?? 0),
            ])
            ->sortBy('service_id')
            ->values()
            ->all();

        $serviceIds = array_column($roomsInput, 'service_id');

        if (count($serviceIds) !== count(array_unique($serviceIds))) {
            throw ValidationException::withMessages([
                'rooms' => 'The same room cannot be added twice to one booking.',
            ]);
        }

        $idempotencyKey = trim((string) $request->header('Idempotency-Key', ''));

        if ($idempotencyKey === '') {
            $idempotencyKey = (string) Str::uuid();
        }

        if (strlen($idempotencyKey) > 64) {
            throw ValidationException::withMessages([
                'idempotency_key' => 'The idempotency key must be 64 characters or fewer.',
            ]);
        }

        $requestHash = hash('sha256', json_encode([
            'check_in' => $validated['check_in'],
            'check_out' => $validated['check_out'],
            'rooms' => $roomsInput,
            'contact_name' => $validated['contact_name'],
            'contact_email' => $validated['contact_email'],
            'contact_phone' => $contactPhone,
            'payment_method' => $validated['payment_method'],
        ]));

        $existing = Booking::query()
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existing) {
            return $this->replayBooking($existing, $requestHash);
        }

        try {
            $booking = DB::transaction(function () use (
                $request,
                $validated,
                $contactPhone,
                $roomsInput,
                $serviceIds,
                $idempotencyKey,
                $requestHash,
                $pricing,
                $availability,
            ) {
                $services = Service::query()
                    ->whereIn('id', $serviceIds)
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                if ($services->count() !== count($serviceIds)) {
                    throw ValidationException::withMessages([
                        'rooms' => 'One or more selected rooms could not be found.',
                    ]);
                }

                if ($services->contains(fn (Service $service) => $service->status !== 'active')) {
                    throw ValidationException::withMessages([
                        'rooms' => 'One or more selected rooms are not available.',
                    ]);
                }

                $exclusive = $services->firstWhere('kind', 'exclusive');

                if ($exclusive && $services->count() > 1) {
                    throw ValidationException::withMessages([
                        'rooms' => 'The whole villa cannot be combined with private rooms.',
                    ]);
                }

                foreach ($roomsInput as $room) {
                    $service = $services->get($room['service_id']);
                    $guests = $room['adults'] + $room['kids'];

                    if ($service?->pax !== null && $guests > (int) $service->pax) {
                        throw ValidationException::withMessages([
                            'rooms' => "{$service->name} is only good for {$service->pax} guests.",
                        ]);
                    }
                }

                $exclusiveServiceId = Service::query()
                    ->where('kind', 'exclusive')
                    ->value('id');

                $availability->assertAvailable(
                    $serviceIds,
                    $validated['check_in'],
                    $validated['check_out'],
                    $exclusiveServiceId !== null ? (int) $exclusiveServiceId : null,
                );

                $quote = $pricing->quote(
                    $services->values(),
                    $validated['check_in'],
                    $validated['check_out'],
                );

                if ($quote['nights'] < 1) {
                    throw ValidationException::withMessages([
                        'check_out' => 'The stay must be at least one night.',
                    ]);
                }

                $roomInputsById = collect($roomsInput)->keyBy('service_id');
                $adults = (int) collect($roomsInput)->sum('adults');
                $kids = (int) collect($roomsInput)->sum('kids');

                $booking = Booking::create([
                    'user_id' => $request->user()->id,
                    'reference' => $this->makeBookingReference(),
                    'contact_name' => $validated['contact_name'],
                    'contact_email' => $validated['contact_email'],
                    'contact_phone' => $contactPhone,
                    'check_in' => $validated['check_in'],
                    'check_out' => $validated['check_out'],
                    'nights' => $quote['nights'],
                    'adults' => $adults,
                    'kids' => $kids,
                    'subtotal' => $quote['subtotal'],
                    'total' => $quote['total'],
                    'currency' => 'PHP',
                    'status' => 'pending_payment',
                    'payment_method' => $validated['payment_method'],
                    'expires_at' => Payment::makeQrExpiry(),
                    'idempotency_key' => $idempotencyKey,
                    'request_hash' => $requestHash,
                ]);

                foreach ($quote['rooms'] as $quotedRoom) {
                    /** @var Service $service */
                    $service = $quotedRoom['service'];
                    $room = $roomInputsById->get($service->id);

                    $booking->rooms()->create([
                        'service_id' => $service->id,
                        'service_name' => $service->name,
                        'kind' => $service->kind,
                        'adults' => (int) ($room['adults'] ?? 1),
                        'kids' => (int) ($room['kids'] ?? 0),
                        'weekday_price' => $quotedRoom['weekday_price'],
                        'weekend_price' => $quotedRoom['weekend_price'],
                        'line_total' => $quotedRoom['line_total'],
                    ]);
                }

                $rawToken = Str::random(48);
                $publicUrl = rtrim((string) config('payments.public_url'), '/');

                $payment = $booking->payments()->create([
                    'reference' => $this->makePaymentReference(),
                    'provider' => 'demo',
                    'method' => $validated['payment_method'],
                    'amount' => $quote['total'],
                    'currency' => 'PHP',
                    'status' => 'pending',
                    'idempotency_key' => $idempotencyKey,
                    'qr_token_hash' => hash('sha256', $rawToken),
                    'qr_url' => $publicUrl.'/pay/'.$rawToken,
                    'qr_expires_at' => Payment::makeQrExpiry(),
                    'metadata' => [
                        'check_in' => $validated['check_in'],
                        'check_out' => $validated['check_out'],
                    ],
                ]);

                PaymentEvent::record(
                    'booking_created',
                    $payment,
                    $booking,
                    'user',
                    [
                        'reference' => $booking->reference,
                        'total' => (string) $booking->total,
                    ],
                    $idempotencyKey,
                    $request,
                );

                PaymentEvent::record(
                    'payment_created',
                    $payment,
                    $booking,
                    'user',
                    [
                        'reference' => $payment->reference,
                        'method' => $payment->method,
                    ],
                    $idempotencyKey,
                    $request,
                );

                PaymentEvent::record(
                    'qr_issued',
                    $payment,
                    $booking,
                    'system',
                    ['expires_at' => $payment->qr_expires_at?->toIso8601String()],
                    $idempotencyKey,
                    $request,
                );

                return $booking;
            });
        } catch (QueryException $exception) {
            // A concurrent retry can win the unique index race. Return the
            // original booking instead of surfacing a database error.
            if ((string) $exception->getCode() !== '23000') {
                throw $exception;
            }

            $existing = Booking::query()
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if (! $existing) {
                throw $exception;
            }

            return $this->replayBooking($existing, $requestHash);
        }

        $booking = $booking->fresh(['rooms', 'payment']);

        ActivityLogger::record(
            'booking_created',
            $request->user(),
            "Created booking {$booking->reference}.",
            Booking::class,
            $booking->id,
            [
                'reference' => $booking->reference,
                'total' => (string) $booking->total,
                'rooms' => $booking->rooms->count(),
            ],
            $request,
        );

        return response()->json([
            'success' => true,
            'message' => 'Booking created. Scan the QR code to confirm the demo payment.',
            'data' => $this->bookingPayload($booking),
        ], 201);
    }

public function cancel(Request $request, string $reference): JsonResponse
    {
        $booking = Booking::query()
            ->where('reference', $reference)
            ->with(['rooms.service.images', 'payment', 'latestCancellationRequest'])
            ->firstOrFail();

        $this->authorizeOwner($request, $booking);

        if (! in_array($booking->status, ['pending_payment', 'confirmed'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'This booking can no longer be cancelled.',
            ], 422);
        }

        if ($booking->check_in !== null && $booking->check_in->lt(now()->startOfDay()->addDays(7))) {
            return response()->json([
                'success' => false,
                'message' => 'Cancellations are only accepted at least 7 days before check-in. For emergencies, please contact the admin to request a refund.',
            ], 422);
        }

        $booking->forceFill([
            'status' => 'cancelled',
        ])->save();

        if ($booking->payment && $booking->payment->status !== 'cancelled') {
            $booking->payment->forceFill(['status' => 'cancelled'])->save();
        }

        PaymentEvent::record(
            'booking_cancelled',
            $booking->payment,
            $booking,
            'user',
            [
                'reference' => $booking->reference,
                'previous_status' => $booking->getOriginal('status'),
            ],
            null,
            $request,
        );

        ActivityLogger::record(
            'booking_cancelled',
            $request->user(),
            "Cancelled booking {$booking->reference}.",
            Booking::class,
            $booking->id,
            ['reference' => $booking->reference],
            $request,
        );

        return response()->json([
            'success' => true,
            'message' => 'Booking cancelled.',
            'data' => $this->bookingPayload($booking->fresh(['rooms', 'payment'])),
        ]);
    }
    public function requestCancellation(Request $request, string $reference): JsonResponse
    {
        $booking = Booking::query()
            ->where('reference', $reference)
            ->with(['rooms.service.images', 'payment', 'latestCancellationRequest'])
            ->firstOrFail();

        $this->authorizeOwner($request, $booking);

        if ($booking->status !== 'confirmed') {
            return response()->json([
                'success' => false,
                'message' => 'Only confirmed bookings can request an emergency cancellation.',
            ], 422);
        }

        if ($booking->check_in === null || $booking->check_in->gte(now()->startOfDay()->addDays(7))) {
            return response()->json([
                'success' => false,
                'message' => 'You can still cancel this booking directly. Use the cancel button instead.',
            ], 422);
        }

        if ($booking->latestCancellationRequest
            && $booking->latestCancellationRequest->status === 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'A cancellation request for this booking is already pending review.',
            ], 409);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
            'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        $proofPath = null;
        $proofOriginalName = null;

        if ($request->hasFile('proof')) {
            $file = $request->file('proof');
            $proofOriginalName = $file->getClientOriginalName();
            $proofPath = $file->store("cancel-requests/{$booking->reference}", 'local');
        }

        $cancelRequest = $booking->cancellationRequests()->create([
            'user_id' => $request->user()?->id,
            'reason' => $validated['reason'],
            'proof_path' => $proofPath,
            'proof_original_name' => $proofOriginalName,
            'status' => 'pending',
        ]);

        $recipient = config('services.cancel_request.recipient');

        if (! is_string($recipient) || trim($recipient) === '') {
            return response()->json([
                'success' => false,
                'message' => 'The cancellation request service is temporarily unavailable. Please try again later.',
            ], 503);
        }

        Mail::to($recipient)->send(new CancellationRequestMail(
            booking: $booking,
            reason: $validated['reason'],
            proofPath: $proofPath,
            proofOriginalName: $proofOriginalName,
        ));

        PaymentEvent::record(
            'cancel_requested',
            $booking->payment,
            $booking,
            'user',
            [
                'request_id' => $cancelRequest->id,
                'reason' => $validated['reason'],
                'has_proof' => $proofPath !== null,
            ],
            null,
            $request,
        );

        ActivityLogger::record(
            'booking_cancel_requested',
            $request->user(),
            "Requested emergency cancellation for booking {$booking->reference}.",
            Booking::class,
            $booking->id,
            ['reference' => $booking->reference, 'request_id' => $cancelRequest->id],
            $request,
        );

        return response()->json([
            'success' => true,
            'message' => 'Your cancellation request has been sent to customer service. We will review it and contact you by email.',
            'data' => [
                'id' => $cancelRequest->id,
                'status' => $cancelRequest->status,
                'requested_at' => $cancelRequest->created_at?->toIso8601String(),
            ],
        ]);
    }

    private function replayBooking(Booking $booking, string $requestHash): JsonResponse
    {
            if ($booking->request_hash !== null && ! hash_equals($booking->request_hash, $requestHash)) {
            return response()->json([
                'success' => false,
                'message' => 'This idempotency key was already used with different booking details.',
            ], 409);
        }

        return response()->json([
            'success' => true,
            'message' => 'This booking was already created.',
            'data' => $this->bookingPayload($booking->fresh(['rooms', 'payment'])),
        ]);
    }

    private function authorizeOwner(Request $request, Booking $booking): void
    {
        $user = $request->user();

        if ($user?->role === 'admin') {
            return;
        }

        abort_unless($booking->user_id === $user?->id, 403, 'You cannot view this booking.');
    }

    private function makeBookingReference(): string
    {
        do {
            $reference = 'VC-'.strtoupper(Str::random(8));
        } while (Booking::query()->where('reference', $reference)->exists());

        return $reference;
    }

    private function makePaymentReference(): string
    {
        do {
            $reference = Payment::makeReference();
        } while (Payment::query()->where('reference', $reference)->exists());

        return $reference;
    }

    /**
     * @return array<string, mixed>
     */
    private function bookingPayload(Booking $booking): array
    {
        if ($booking->isCompleted() && $booking->completed_at === null) {
            $booking->forceFill(['completed_at' => now()])->save();
            $booking->completed_at = $booking->completed_at ?? now();
        }

        $payment = $booking->payment;

        $lifecycle = match (true) {
            $booking->status === 'pending_payment' => 'pending',
            $booking->status === 'expired' => 'expired',
            $booking->status === 'cancelled' => 'cancelled',
            $booking->status === 'confirmed' && $booking->check_out->isPast() => 'completed',
            default => 'booked',
        };

        return [
            'reference' => $booking->reference,
            'status' => $booking->status,
            'lifecycle' => $lifecycle,
            'completed_at' => $booking->completed_at?->toIso8601String(),
            'check_in' => $booking->check_in->format('Y-m-d'),
            'check_out' => $booking->check_out->format('Y-m-d'),
            'nights' => $booking->nights,
            'adults' => $booking->adults,
            'kids' => $booking->kids,
            'subtotal' => (string) $booking->subtotal,
            'total' => (string) $booking->total,
            'currency' => $booking->currency,
            'payment_method' => $booking->payment_method,
            'cancellation_request' => $booking->latestCancellationRequest ? [
                'id' => $booking->latestCancellationRequest->id,
                'status' => $booking->latestCancellationRequest->status,
                'reason' => $booking->latestCancellationRequest->reason,
                'requested_at' => $booking->latestCancellationRequest->created_at?->toIso8601String(),
            ] : null,
            'confirmed_at' => $booking->confirmed_at?->toIso8601String(),
            'confirmation_email_sent_at' => $booking->confirmation_email_sent_at?->toIso8601String(),
            'contact' => [
                'name' => $booking->contact_name,
                'email' => $booking->contact_email,
                'phone' => $booking->contact_phone,
            ],
            'rooms' => $booking->rooms->map(fn ($room) => [
                'service_id' => $room->service_id,
                'name' => $room->service_name,
                'kind' => $room->kind,
                'adults' => $room->adults,
                'kids' => $room->kids,
                'weekday_price' => (string) $room->weekday_price,
                'weekend_price' => (string) $room->weekend_price,
                'line_total' => (string) $room->line_total,
                'description' => $room->service?->description,
                'image_url' => $room->service?->images?->first()?->image_url,
            ])->values(),
            'payment' => $payment ? [
                'reference' => $payment->reference,
                'provider' => $payment->provider,
                'method' => $payment->method,
                'amount' => (string) $payment->amount,
                'currency' => $payment->currency,
                'status' => $payment->status,
                'qr_url' => $payment->publicQrUrl(),
                'qr_expires_at' => $payment->qr_expires_at?->toIso8601String(),
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'is_expired' => $payment->isExpired(),
            ] : null,
            'created_at' => $booking->created_at?->toIso8601String(),
        ];
    }
}
