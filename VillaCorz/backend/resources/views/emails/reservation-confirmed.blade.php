<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>VillaCorz reservation confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f7;padding:24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
                    <tr>
                        <td style="background-color:#006dfc;padding:26px 28px;color:#ffffff;">
                            <p style="margin:0;font-size:12px;letter-spacing:3px;text-transform:uppercase;opacity:0.85;">VillaCorz Beach House</p>
                            <h1 style="margin:8px 0 0;font-size:23px;line-height:1.3;">Your reservation is confirmed</h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:26px 28px 8px;">
                            <p style="margin:0 0 14px;font-size:14px;line-height:1.6;">
                                Hi {{ $booking->contact_name ?: 'Guest' }},
                            </p>
                            <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#475569;">
                                We have received your payment. Keep the reference number below for your villa confirmation.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:0 28px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f9ff;border:1px solid #dbeafe;border-radius:10px;">
                                <tr>
                                    <td style="padding:16px 18px;">
                                        <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#64748b;">Reservation reference</p>
                                        <p style="margin:4px 0 0;font-size:22px;font-weight:bold;letter-spacing:1px;color:#006dfc;">{{ $booking->reference }}</p>
                                        <p style="margin:6px 0 0;font-size:11px;color:#64748b;">Payment reference: {{ $booking->payment?->reference ?? '—' }}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:22px 28px 0;">
                            <h2 style="margin:0 0 10px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#64748b;">Stay details</h2>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.6;border-collapse:collapse;">
                                <tr>
                                    <td style="padding:6px 0;color:#64748b;">Check-in</td>
                                    <td style="padding:6px 0;text-align:right;font-weight:bold;">{{ $booking->check_in->format('D, M j, Y') }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0;color:#64748b;">Check-out</td>
                                    <td style="padding:6px 0;text-align:right;font-weight:bold;">{{ $booking->check_out->format('D, M j, Y') }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0;color:#64748b;">Nights</td>
                                    <td style="padding:6px 0;text-align:right;font-weight:bold;">{{ $booking->nights }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0;color:#64748b;">Guests</td>
                                    <td style="padding:6px 0;text-align:right;font-weight:bold;">{{ $booking->adults }} adult{{ $booking->adults === 1 ? '' : 's' }}@if($booking->kids > 0), {{ $booking->kids }} kid{{ $booking->kids === 1 ? '' : 's' }}@endif</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:20px 28px 0;">
                            <h2 style="margin:0 0 10px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#64748b;">Reserved accommodation</h2>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;">
                                @foreach($booking->rooms as $room)
                                    <tr>
                                        <td style="padding:8px 0;border-bottom:1px solid #eef2f7;">
                                            <strong style="display:block;color:#1f2937;">{{ $room->service_name }}</strong>
                                            <span style="font-size:11px;color:#64748b;">
                                                {{ $room->adults }} adult{{ $room->adults === 1 ? '' : 's' }}@if($room->kids > 0), {{ $room->kids }} kid{{ $room->kids === 1 ? '' : 's' }}@endif
                                            </span>
                                        </td>
                                        <td style="padding:8px 0;border-bottom:1px solid #eef2f7;text-align:right;white-space:nowrap;font-weight:bold;">
                                            &#8369;{{ number_format((float) $room->line_total, 2) }}
                                        </td>
                                    </tr>
                                @endforeach
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:18px 28px 0;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:10px;font-size:13px;">
                                <tr>
                                    <td style="padding:12px 16px;color:#9a3412;">Total paid</td>
                                    <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:bold;color:#c2410c;">&#8369;{{ number_format((float) $booking->total, 2) }}</td>
                                </tr>
                            </table>
                            <p style="margin:10px 0 0;font-size:11px;color:#64748b;">
                                Paid via {{ $booking->payment->method ?? $booking->payment_method ?? 'demo payment' }} on
                                {{ $booking->payment?->paid_at?->format('M j, Y g:i A') ?? now()->format('M j, Y g:i A') }}.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:22px 28px 0;">
                            <p style="margin:0;font-size:12px;line-height:1.6;color:#475569;">
                                Please present this reference number when you arrive. If you need to change or cancel your reservation,
                                contact VillaCorz and include the reference above.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:24px 28px 28px;">
                            <p style="margin:0;font-size:11px;color:#94a3b8;border-top:1px solid #eef2f7;padding-top:16px;">
                                This is a demo confirmation for a university project. No real payment was processed.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
