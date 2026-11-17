import { useEffect } from 'react'
import { Loader2, MailCheck, ShieldCheck } from 'lucide-react'

type PhoneVerifyModalProps = {
    phoneNumber: string
    code: string
    sending: boolean
    verifying: boolean
    error?: string
    status?: string
    developmentCode?: string
    onCodeChange: (value: string) => void
    onClose: () => void
    onResend: () => void
    onVerify: () => void
}

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

function PhoneVerifyModal({
    phoneNumber,
    code,
    sending,
    verifying,
    error,
    status,
    developmentCode,
    onCodeChange,
    onClose,
    onResend,
    onVerify,
}: PhoneVerifyModalProps) {
    const busy = sending || verifying

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !busy) {
                onClose()
            }
        }

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [busy, onClose])

    return (
        <div
            className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) {
                    onClose()
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="verify-phone-title"
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
            >
                <span className="grid size-11 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="size-5" aria-hidden="true" />
                </span>

                <h2
                    id="verify-phone-title"
                    className="mt-4 text-xl font-bold tracking-tight text-slate-900"
                >
                    Verify {phoneNumber}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                    We sent a 6-digit code to your account email. Enter it below to mark
                    this number as verified.
                </p>

                {status && (
                    <p className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
                        <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        {status}
                    </p>
                )}

                {developmentCode && (
                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                        Local development code: <strong>{developmentCode}</strong>
                    </p>
                )}

                <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Verification code
                    </span>
                    <input
                        value={code}
                        onChange={(event) =>
                            onCodeChange(
                                event.target.value.replace(/\D/g, '').slice(0, 6),
                            )
                        }
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        maxLength={6}
                        aria-invalid={Boolean(error)}
                        className={`min-h-11 w-full rounded-lg border px-3 text-center text-lg font-semibold tracking-[0.35em] text-slate-900 outline-none transition focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/20 ${
                            error ? 'border-rose-300' : 'border-slate-300'
                        }`}
                    />
                </label>

                {error && (
                    <p role="alert" className="mt-2 text-xs leading-5 text-rose-700">
                        {error}
                    </p>
                )}

                <div className="mt-5 flex flex-col gap-2.5">
                    <button
                        type="button"
                        onClick={onVerify}
                        disabled={busy || code.length !== 6}
                        className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#006dfc] px-5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(36,107,206,0.18)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 ${focusRing}`}
                    >
                        {verifying && (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        )}
                        {verifying ? 'Verifying…' : 'Verify number'}
                    </button>
                    <div className="flex gap-2.5">
                        <button
                            type="button"
                            onClick={onResend}
                            disabled={busy}
                            className={`min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                        >
                            {sending ? 'Sending…' : 'Resend code'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            className={`min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default PhoneVerifyModal