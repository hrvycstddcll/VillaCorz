import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

type CancellationPolicyModalProps = {
    open: boolean
    onContinue: () => void
    onClose: () => void
}

const CancellationPolicyModal = ({
    open,
    onContinue,
    onClose,
}: CancellationPolicyModalProps) => {
    useEffect(() => {
        if (!open) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancellation-policy-title"
                aria-describedby="cancellation-policy-description"
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
            >
                <span className="grid size-11 place-items-center rounded-full bg-amber-50 text-amber-600">
                    <AlertTriangle className="size-5" aria-hidden="true" />
                </span>

                <h2
                    id="cancellation-policy-title"
                    className="mt-4 text-xl font-bold tracking-tight text-slate-900"
                >
                    Cancellation policy
                </h2>
                <p
                    id="cancellation-policy-description"
                    className="mt-2 text-sm leading-6 text-slate-600"
                >
                    Please review before continuing to payment.
                </p>

                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                    <li className="flex gap-2">
                        <span
                            aria-hidden="true"
                            className="mt-1 size-1.5 shrink-0 rounded-full bg-[#006dfc]"
                        />
                        Your reservation is only saved after the QR payment is
                        confirmed. Unpaid QR codes expire and you will need to
                        book again.
                    </li>
                    <li className="flex gap-2">
                        <span
                            aria-hidden="true"
                            className="mt-1 size-1.5 shrink-0 rounded-full bg-[#006dfc]"
                        />
                        Cancellations are only accepted up to 7 days before
                        check-in.
                    </li>
                    <li className="flex gap-2">
                        <span
                            aria-hidden="true"
                            className="mt-1 size-1.5 shrink-0 rounded-full bg-[#006dfc]"
                        />
                        For emergencies, please contact the admin to request a
                        refund.
                    </li>
                </ul>

                <div className="mt-6 flex flex-col gap-2.5">
                    <button
                        type="button"
                        onClick={onContinue}
                        className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#006dfc] px-5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(36,107,206,0.18)] transition hover:bg-blue-700 ${focusRing}`}
                    >
                        I understand, continue
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`min-h-11 w-full rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 ${focusRing}`}
                    >
                        Go back
                    </button>
                </div>
            </section>
        </div>
    )
}

export default CancellationPolicyModal