<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - VillaCorz</title>
</head>
<body style="margin:0; padding:0; background-color:#eef2f9; font-family:'Segoe UI', Arial, Helvetica, sans-serif; color:#1f2937; -webkit-font-smoothing:antialiased;">

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef2f9; padding:40px 16px;">
        <tr>
            <td align="center">

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:540px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.05);">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #006DFC 0%, #0054c7 100%); padding:36px 28px 30px;">
                            @if (!empty(env('VILLACORZ_LOGO_URL')))
                                <img
                                    src="{{ env('VILLACORZ_LOGO_URL') }}"
                                    alt="VillaCorz"
                                    width="160"
                                    style="display:block; width:160px; max-width:100%; height:auto; border:0; margin:0 auto 16px;"
                                >
                            @else
                                <div style="margin-bottom:14px;">
                                    <span style="display:inline-block; color:#ffffff; font-size:28px; line-height:1.2; font-weight:700; letter-spacing:1px;">
                                        VillaCorz
                                    </span>
                                </div>
                            @endif
                            <h1 style="margin:0; color:#ffffff; font-size:20px; line-height:1.3; font-weight:600; letter-spacing:0.3px; opacity:0.95;">
                                Email Verification
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:36px 32px 32px;">

                            <h2 style="margin:0 0 6px; color:#111827; font-size:22px; line-height:1.3; font-weight:700; text-align:center;">
                                Verify Your Email
                            </h2>

                            <div style="width:48px; height:3px; background-color:#006DFC; border-radius:2px; margin:0 auto 24px;"></div>

                            <p style="margin:0 0 12px; color:#374151; font-size:15px; line-height:1.6;">
                                Hi <strong style="color:#111827;">{{ $firstname }}</strong>,
                            </p>

                            <p style="margin:0 0 28px; color:#4b5563; font-size:14px; line-height:1.65;">
                                Thanks for creating your VillaCorz account. Please use the verification code below to confirm your email address and complete your registration.
                            </p>

                            <!-- OTP Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(180deg, #f8faff 0%, #eef4ff 100%); border:1px solid #d4e4ff; border-radius:12px;">
                                <tr>
                                    <td align="center" style="padding:24px 16px 8px;">
                                        <p style="margin:0; color:#6b7280; font-size:11px; line-height:1.4; font-weight:600; letter-spacing:1.5px; text-transform:uppercase;">
                                            Your Verification Code
                                        </p>
                                    </td>
                                </tr>

                                <tr>
                                    <td align="center" style="padding:12px 8px 24px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                @for ($i = 0; $i < 6; $i++)
                                                    <td align="center" valign="middle" style="padding:0 4px;">
                                                        <table role="presentation" width="42" height="50" cellspacing="0" cellpadding="0" border="0" style="width:42px; height:50px; background-color:#ffffff; border:1.5px solid #c5daff; border-radius:10px; box-shadow:0 1px 4px rgba(0,109,252,0.08);">
                                                            <tr>
                                                                <td align="center" valign="middle" style="height:50px; color:#006DFC; font-size:24px; line-height:1; font-weight:700; letter-spacing:0;">
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

                            <!-- Expiry -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;">
                                <tr>
                                    <td align="center" style="padding:12px 16px; background-color:#fef9ee; border:1px solid #fde68a; border-radius:8px;">
                                        <p style="margin:0; color:#92400e; font-size:13px; line-height:1.5;">
                                            ⏱ This code expires in <strong>10 minutes</strong>.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Security Notice -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px; background-color:#f8fafc; border:1px solid #e5e7eb; border-radius:10px;">
                                <tr>
                                    <td style="padding:18px 20px;">
                                        <p style="margin:0 0 6px; color:#374151; font-size:13px; line-height:1.4; font-weight:700;">
                                            🔒 Keep your account secure
                                        </p>
                                        <p style="margin:0; color:#6b7280; font-size:12px; line-height:1.55;">
                                            Never share this verification code with anyone. VillaCorz will never ask you to disclose your code through an unsolicited message.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:22px 0 0; color:#6b7280; font-size:12px; line-height:1.55; text-align:center;">
                                If you didn't create a VillaCorz account, you can safely ignore this email.
                            </p>

                            <p style="margin:22px 0 0; color:#374151; font-size:13px; line-height:1.6; text-align:center;">
                                Best regards,<br>
                                <strong style="color:#006DFC;">The VillaCorz Team</strong>
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color:#f1f5f9; border-top:1px solid #e2e8f0; padding:20px 24px;">
                            <p style="margin:0 0 6px; color:#64748b; font-size:11px; line-height:1.5;">
                                © {{ date('Y') }} VillaCorz. All rights reserved.
                            </p>
                            <p style="margin:0; color:#94a3b8; font-size:11px; line-height:1.5;">
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
