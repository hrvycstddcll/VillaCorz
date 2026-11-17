import { useEffect } from 'react'
import { Loader2, Phone } from 'lucide-react'

type SavePhoneModalProps = {
    phoneNumber: string
    loading: boolean
    error?: string
    onClose: () => void
    onContinue: () => void
}

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

function SavePhoneModal({
    phoneNumber,
    loading,
    error,
    onClose,
    onContinue,
}: SavePhoneModalProps) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !loading) {
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
    }, [loading, onClose])

    return (
        <div
            className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) {
                    onClose()
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="save-phone-title"
                aria-describedby="save-phone-description"
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
            >
                <span className="grid size-11 place-items-center rounded-full bg-blue-50 text-[#006dfc]">
                    <Phone className="size-5" aria-hidden="true" />
                </span>

                <h2
                    id="save-phone-title"
                    className="mt-4 text-xl font-bold tracking-tight text-slate-900"
                >
                    Save this number?
                </h2>
                <p
                    id="save-phone-description"
                    className="mt-2 text-sm leading-6 text-slate-600"
                >
                    Use <strong className="font-semibold text-slate-800">{phoneNumber}</strong> as
                    a personal number on your account for future reservations.
                </p>

                {error && (
                    <p
                        role="alert"
                        className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700"
                    >
                        {error}
                    </p>
                )}

                <div className="mt-6 flex flex-col gap-2.5">
                    <button
                        type="button"
                        onClick={onContinue}
                        disabled={loading}
                        className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#006dfc] px-5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(36,107,206,0.18)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 ${focusRing}`}
                    >
                        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                        {loading ? 'Saving…' : 'Continue'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className={`min-h-11 w-full rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                    >
                        Close
                    </button>
                </div>
            </section>
        </div>
    )
}

export default SavePhoneModal