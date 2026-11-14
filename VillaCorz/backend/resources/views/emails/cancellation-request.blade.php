<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Emergency cancellation request</title>
</head>
<body>
    <h1>Emergency cancellation request</h1>
    <p><strong>Reference:</strong> {{ $booking->reference }}</p>
    <p><strong>Guest:</strong> {{ $booking->contact_name }}</p>
    <p><strong>Email:</strong> {{ $booking->contact_email }}</p>
    <p><strong>Phone:</strong> {{ $booking->contact_phone ?: 'Not provided' }}</p>
    <p><strong>Check-in:</strong> {{ $booking->check_in->format('D, M j, Y') }}</p>
    <p><strong>Check-out:</strong> {{ $booking->check_out->format('D, M j, Y') }}</p>
    <p><strong>Payment method:</strong> {{ $booking->payment_method ?: 'Not specified' }}</p>
    <p><strong>Total:</strong> {{ $booking->currency }} {{ number_format((float) $booking->total, 2) }}</p>
    <p><strong>Reason:</strong></p>
    <p>{!! nl2br(e($reason)) !!}</p>
    @if($proofOriginalName)
        <p><strong>Attached proof:</strong> {{ $proofOriginalName }}</p>
    @endif
    <p style="font-size:12px; color:#64748b;">This is an automated notification. Review and process the cancellation and any refund manually.</p>
</body>
</html>
