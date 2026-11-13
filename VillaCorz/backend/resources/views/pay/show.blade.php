<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>VillaCorz demo payment</title>
    <style>
        :root {
            --blue: #006dfc;
            --ink: #0f172a;
            --muted: #64748b;
            --line: #e2e8f0;
            --green: #047857;
            --green-bg: #ecfdf5;
            --amber: #b45309;
            --amber-bg: #fffbeb;
            --rose: #be123c;
            --rose-bg: #fff1f2;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            padding: 24px 14px 40px;
            background: #eef2f7;
            color: var(--ink);
            font-family: "Segoe UI", Roboto, Arial, sans-serif;
        }
        .shell { width: 100%; max-width: 440px; margin: 0 auto; }
        .brand {
            text-align: center;
            margin-bottom: 14px;
            font-size: 11px;
            letter-spacing: 0.32em;
            text-transform: uppercase;
            color: var(--muted);
        }
        .card {
            background: #fff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        }
        .card-head {
            background: var(--blue);
            color: #fff;
            padding: 22px 22px 20px;
        }
        .card-head p {
            margin: 0 0 6px;
            font-size: 10px;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            opacity: 0.82;
        }
        .card-head h1 { margin: 0; font-size: 22px; line-height: 1.25; }
        .card-body { padding: 20px 22px 24px; }
        .status {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            padding: 13px 14px;
            border-radius: 10px;
            font-size: 13px;
            line-height: 1.5;
            margin-bottom: 18px;
        }
        .status strong { display: block; font-size: 14px; margin-bottom: 2px; }
        .status.paid { background: var(--green-bg); color: var(--green); }
        .status.pending { background: var(--amber-bg); color: var(--amber); }
        .status.expired { background: var(--rose-bg); color: var(--rose); }
        .status-icon {
            flex: 0 0 30px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            background: rgba(255, 255, 255, 0.7);
            font-size: 16px;
            font-weight: 700;
        }
        .reference {
            border: 1px solid #dbeafe;
            background: #f5f9ff;
            border-radius: 10px;
            padding: 13px 15px;
            margin-bottom: 18px;
        }
        .reference span {
            display: block;
            font-size: 10px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: var(--muted);
        }
        .reference strong {
            display: block;
            margin-top: 4px;
            font-size: 21px;
            letter-spacing: 0.06em;
            color: var(--blue);
        }
        .reference small { display: block; margin-top: 5px; color: var(--muted); font-size: 11px; }
        h2 {
            margin: 0 0 8px;
            font-size: 11px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: var(--muted);
        }
        .rows { margin: 0 0 18px; font-size: 13px; border-collapse: collapse; width: 100%; }
        .rows td { padding: 7px 0; border-bottom: 1px solid var(--line); }
        .rows tr:last-child td { border-bottom: 0; }
        .rows td:first-child { color: var(--muted); }
        .rows td:last-child { text-align: right; font-weight: 600; }
        .room { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
        .room:last-child { border-bottom: 0; }
        .room strong { display: block; }
        .room small { color: var(--muted); font-size: 11px; }
        .total {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 16px 0 18px;
            padding: 13px 15px;
            border-radius: 10px;
            background: #fff7ed;
            border: 1px solid #fed7aa;
            color: #9a3412;
            font-size: 13px;
        }
        .total strong { font-size: 20px; color: #c2410c; }
        .button {
            display: block;
            width: 100%;
            min-height: 52px;
            border: 0;
            border-radius: 999px;
            background: var(--blue);
            color: #fff;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.02em;
            cursor: pointer;
            box-shadow: 0 6px 16px rgba(0, 109, 252, 0.28);
        }
        .button:active { transform: translateY(1px); }
        .button[disabled] { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }
        .note {
            margin: 16px 0 0;
            font-size: 11px;
            line-height: 1.6;
            color: var(--amber);
            text-align: center;
        }
        .paid-note { margin: 14px 0 0; font-size: 11px; line-height: 1.6; color: var(--muted); text-align: center; }
        .back { display: block; margin-top: 18px; text-align: center; font-size: 12px; color: var(--muted); text-decoration: none; }
        .back:hover { color: var(--blue); }
    </style>
</head>
<body>
    @php
        $status = $payment->status;
        $expired = $payment->isExpired();
        $isPaid = $status === 'paid';
        $isCancelled = $status === 'cancelled';
        $contactName = $booking->contact_name ?: 'Guest';
        $nights = (int) $booking->nights;
        $guests = (int) $booking->adults + (int) $booking->kids;
    @endphp

    <div class="shell">
        <p class="brand">VillaCorz Beach House</p>

        <div class="card">
            <div class="card-head">
                <p>Demo payment</p>
                <h1>{{ $isPaid ? 'Reservation confirmed' : ($isCancelled ? 'Reservation unavailable' : ($expired ? 'Payment expired' : 'Confirm your reservation')) }}</h1>
            </div>

            <div class="card-body">
                @if($isPaid)
                    <div class="status paid">
                        <span class="status-icon">✓</span>
                        <div>
                            <strong>Payment received</strong>
                            Your villa reservation is confirmed. A copy of this receipt was emailed to {{ $booking->contact_email }}.
                        </div>
                    </div>
                @elseif($isCancelled)
                    <div class="status expired">
                        <span class="status-icon">!</span>
                        <div>
                            <strong>Those dates were just taken</strong>
                            {{ session('payment_error') ?: 'Another guest confirmed this room before you did. You were not charged. Please go back and choose different dates.' }}
                        </div>
                    </div>
                @elseif($expired)
                    <div class="status expired">
                        <span class="status-icon">!</span>
                        <div>
                            <strong>This QR code has expired</strong>
                            Please return to the booking page and generate a new reservation.
                        </div>
                    </div>
                @else
                    <div class="status pending">
                        <span class="status-icon">i</span>
                        <div>
                            <strong>Demo payment only</strong>
                            Your room is not reserved until you tap Confirm below. No real money is charged.
                        </div>
                    </div>
                @endif

                <div class="reference">
                    <span>Reservation reference</span>
                    <strong>{{ $booking->reference }}</strong>
                    <small>Payment {{ $payment->reference }} · {{ number_format((float) $payment->amount, 2) }} {{ $payment->currency }}</small>
                </div>

                <h2>Stay details</h2>
                <table class="rows">
                    <tr>
                        <td>Guest</td>
                        <td>{{ $contactName }}</td>
                    </tr>
                    <tr>
                        <td>Check-in</td>
                        <td>{{ $booking->check_in->format('D, M j, Y') }}</td>
                    </tr>
                    <tr>
                        <td>Check-out</td>
                        <td>{{ $booking->check_out->format('D, M j, Y') }}</td>
                    </tr>
                    <tr>
                        <td>Stay</td>
                        <td>{{ $nights }} {{ $nights === 1 ? 'night' : 'nights' }} · {{ $guests }} {{ $guests === 1 ? 'guest' : 'guests' }}</td>
                    </tr>
                    <tr>
                        <td>Method</td>
                        <td>{{ $payment->method }}</td>
                    </tr>
                </table>

                <h2>Reserved accommodation</h2>
                <div>
                    @foreach($booking->rooms as $room)
                        <div class="room">
                            <div>
                                <strong>{{ $room->service_name }}</strong>
                                <small>
                                    {{ $room->adults }} adult{{ $room->adults === 1 ? '' : 's' }}@if($room->kids > 0), {{ $room->kids }} kid{{ $room->kids === 1 ? '' : 's' }}@endif
                                </small>
                            </div>
                            <span>&#8369;{{ number_format((float) $room->line_total, 2) }}</span>
                        </div>
                    @endforeach
                </div>

                <div class="total">
                    <span>Total amount</span>
                    <strong>&#8369;{{ number_format((float) $payment->amount, 2) }}</strong>
                </div>

                @if($isPaid)
                    <p class="paid-note">
                        Paid {{ $payment->paid_at?->format('M j, Y g:i A') ?? 'just now' }}.<br>
                        Please present reference <strong>{{ $booking->reference }}</strong> when you arrive.
                    </p>
                @elseif($isCancelled)
                    <button class="button" type="button" disabled>Dates no longer available</button>
                @elseif($expired)
                    <button class="button" type="button" disabled>QR expired</button>
                @else
                    <form method="POST" action="{{ route('pay.confirm', ['token' => request()->route('token')]) }}">
                        @csrf
                        <input type="hidden" name="idempotency_key" value="{{ $payment->idempotency_key }}">
                        <button class="button" type="submit">Confirm demo payment</button>
                    </form>
                    <p class="note">
                        Your room is only reserved after you tap Confirm here. No real payment is processed.
                    </p>
                @endif

                <a class="back" href="/">Return to VillaCorz</a>
            </div>
        </div>
    </div>
</body>
</html>
