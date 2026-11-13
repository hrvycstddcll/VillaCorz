<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Password reset code</title>
</head>
<body style="margin:0; background:#f4f7fb; color:#1f2937; font-family:Arial,sans-serif;">
    <main style="max-width:520px; margin:32px auto; padding:32px 24px; background:#ffffff; border:1px solid #e5eaf2; border-radius:12px;">
        <p style="margin:0 0 8px; color:#006dfc; font-size:12px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase;">VillaCorz account security</p>
        <h1 style="margin:0 0 20px; font-size:24px; line-height:1.3;">Reset your password</h1>
        <p style="font-size:15px; line-height:1.6;">Hi {{ $firstname }}, use this code to choose a new password:</p>
        <p style="margin:24px 0; padding:18px; border-radius:8px; background:#eff6ff; color:#0056cc; font-size:32px; font-weight:700; letter-spacing:8px; text-align:center;">{{ $code }}</p>
        <p style="font-size:14px; line-height:1.6;">This code expires in 10 minutes and can be used once. If you did not request a password reset, you can ignore this email.</p>
        <p style="margin:28px 0 0; color:#64748b; font-size:12px;">Never share this code with anyone. VillaCorz will never ask you for it.</p>
    </main>
</body>
</html>
