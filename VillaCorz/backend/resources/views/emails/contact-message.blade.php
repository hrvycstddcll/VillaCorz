<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New VillaCorz contact message</title>
</head>
<body>
    <h1>New message from the VillaCorz website</h1>
    <p><strong>Name:</strong> {{ $name }}</p>
    <p><strong>Email:</strong> {{ $senderEmail }}</p>
    <p><strong>Message:</strong></p>
    <p>{!! nl2br(e($messageText)) !!}</p>
</body>
</html>
