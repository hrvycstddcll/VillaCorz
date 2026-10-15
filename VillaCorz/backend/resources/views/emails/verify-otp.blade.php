```blade
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - VillaCorz</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f7ff; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f7ff; padding:32px 12px;">
        <tr>
            <td align="center">

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px; background-color:#ffffff; border-radius:12px; overflow:hidden;">

                    <!-- Blue Header -->
                    <tr>
                        <td align="center" style="background-color:#006DFC; padding:24px 20px;">
                            <h1 style="margin:0; color:#ffffff; font-size:22px; line-height:1.3; font-weight:700; letter-spacing:0.5px;">
                                EMAIL VERIFICATION
                            </h1>
                            <p style="margin:6px 0 0; color:#ffffff; font-size:13px; line-height:1.4;">
                                Welcome to VillaCorz
                            </p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding:28px 24px 24px;">

                            <!-- Logo Inside Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding:0 0 22px;">
                                        @if (!empty(env('VILLACORZ_LOGO_URL')))
                                            <img
                                                src="{{ env('VILLACORZ_LOGO_URL') }}"
                                                alt="VillaCorz"
                                                width="150"
                                                style="display:block; width:150px; max-width:100%; height:auto; border:0;"
                                            >
                                        @else
                                            <span style="display:inline-block; color:#006DFC; font-size:26px; line-height:1.2; font-weight:700; letter-spacing:0.5px;">
                                                VillaCorz
                                            </span>
                                        @endif
                                    </td>
                                </tr>
                            </table>

                            <!-- Greeting -->
                            <h2 style="margin:0 0 10px; color:#111827; font-size:21px; line-height:1.3; font-weight:700; text-align:center;">
                                Verify Your Email
                            </h2>

                            <p style="margin:0 0 8px; color:#374151; font-size:14px; line-height:1.5;">
                                Hi {{ $firstname }},
                            </p>

                            <p style="margin:0 0 22px; color:#4b5563; font-size:14px; line-height:1.5;">
                                Thanks for creating your VillaCorz account. Please use the verification code below to confirm your email address and complete your registration.
                            </p>

                            <!-- OTP Section -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f7ff; border:1px solid #dbeafe; border-radius:10px;">
                                <tr>
                                    <td align="center" style="padding:20px 8px 10px;">
                                        <p style="margin:0; color:#374151; font-size:12px; line-height:1.4; font-weight:600; letter-spacing:1px;">
                                            YOUR VERIFICATION CODE
                                        </p>
                                    </td>
                                </tr>

                                <tr>
                                    <td align="center" style="padding:8px 6px 16px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                @for ($i = 0; $i < 6; $i++)
                                                    <td align="center" valign="middle" style="padding:0 3px;">
                                                        <table role="presentation" width="38" height="46" cellspacing="0" cellpadding="0" border="0" style="width:38px; height:46px; background-color:#ffffff; border:1px solid #b8d3ff; border-radius:7px;">
                                                            <tr>
                                                                <td align="center" valign="middle" style="height:46px; color:#006DFC; font-size:22px; line-height:1; font-weight:700;">
                                                                    {{ $otp[$i] ?? '' }}
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                @endfor
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Expiration Notice -->
                            <p style="margin:18px 0 0; color:#4b5563; font-size:13px; line-height:1.5; text-align:center;">
                                This verification code will expire in
                                <strong style="color:#006DFC;">10 minutes</strong>.
                            </p>

                            <!-- Security Notice -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px; border-top:1px solid #e5e7eb;">
                                <tr>
                                    <td style="padding:18px 0 0;">
                                        <p style="margin:0 0 6px; color:#374151; font-size:13px; line-height:1.4; font-weight:700;">
                                            Keep your account secure
                                        </p>
                                        <p style="margin:0; color:#6b7280; font-size:12px; line-height:1.5;">
                                            Never share this verification code with anyone. VillaCorz will never ask you to disclose your code through an unsolicited message.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:20px 0 0; color:#6b7280; font-size:12px; line-height:1.5;">
                                If you didn't create a VillaCorz account, you can safely ignore this email.
                            </p>

                            <p style="margin:18px 0 0; color:#374151; font-size:13px; line-height:1.5;">
                                Best regards,<br>
                                <strong style="color:#006DFC;">The VillaCorz Team</strong>
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color:#f8fafc; border-top:1px solid #e5e7eb; padding:16px 20px;">
                            <p style="margin:0 0 5px; color:#6b7280; font-size:11px; line-height:1.5;">
                                © {{ date('Y') }} VillaCorz. All rights reserved.
                            </p>
                            <p style="margin:0; color:#9ca3af; font-size:11px; line-height:1.5;">
                                This is an automated email. Please do not reply.
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
```