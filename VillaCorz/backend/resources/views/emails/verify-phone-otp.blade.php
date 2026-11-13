<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Phone Number - VillaCorz</title>
</head>
<body style="margin:0; padding:0; background-color:#eef2f9; font-family:'Segoe UI', Arial, Helvetica, sans-serif; color:#1f2937; -webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef2f9; padding:40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:540px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.05);">
                    <tr>
                        <td align="center" style="background:linear-gradient(135deg,#006DFC 0%,#0054c7 100%); padding:36px 28px 30px;">
                            <span style="display:inline-block; color:#ffffff; font-size:28px; line-height:1.2; font-weight:700; letter-spacing:1px;">
                                VillaCorz
                            </span>
                            <h1 style="margin:12px 0 0; color:#ffffff; font-size:20px; line-height:1.3; font-weight:600; opacity:0.95;">
                                Phone Number Verification
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:36px 32px 32px;">
                            <h2 style="margin:0 0 6px; color:#111827; font-size:22px; line-height:1.3; font-weight:700; text-align:center;">
                                Confirm your phone number
                            </h2>

                            <div style="width:48px; height:3px; background-color:#006DFC; border-radius:2px; margin:0 auto 24px;"></div>

                            <p style="margin:0 0 12px; color:#374151; font-size:15px; line-height:1.6;">
                                Hi <strong style="color:#111827;">{{ $firstname }}</strong>,
                            </p>

                            <p style="margin:0 0 24px; color:#4b5563; font-size:14px; line-height:1.65;">
                                Use the code below to verify
                                <strong style="color:#111827;">{{ $phoneNumber }}</strong>
                                as a phone number on your VillaCorz account.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(180deg,#f8faff 0%,#eef4ff 100%); border:1px solid #d4e4ff; border-radius:12px;">
                                <tr>
                                    <td align="center" style="padding:24px 16px 8px;">
                                        <p style="margin:0; color:#6b7280; font-size:11px; line-height:1.4; font-weight:600; letter-spacing:1.5px; text-transform:uppercase;">
                                            Your Verification Code
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding:8px 16px 24px;">
                                        <span style="display:inline-block; padding:12px 20px; background-color:#ffffff; border:1px solid #c5daff; border-radius:10px; color:#006DFC; font-size:30px; line-height:1; font-weight:700; letter-spacing:8px;">
                                            {{ $otp }}
                                        </span>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;">
                                <tr>
                                    <td align="center" style="padding:12px 16px; background-color:#fef9ee; border:1px solid #fde68a; border-radius:8px;">
                                        <p style="margin:0; color:#92400e; font-size:13px; line-height:1.5;">
                                            This code expires in <strong>10 minutes</strong>.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:26px 0 0; color:#6b7280; font-size:12px; line-height:1.55;">
                                If you did not request this change, you can safely ignore this email. Your phone number will not be verified.
                            </p>

                            <p style="margin:22px 0 0; color:#374151; font-size:13px; line-height:1.6;">
                                Best regards,<br>
                                <strong style="color:#006DFC;">The VillaCorz Team</strong>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="background-color:#f1f5f9; border-top:1px solid #e2e8f0; padding:20px 24px;">
                            <p style="margin:0 0 6px; color:#64748b; font-size:11px; line-height:1.5;">
                                &copy; {{ date('Y') }} VillaCorz. All rights reserved.
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