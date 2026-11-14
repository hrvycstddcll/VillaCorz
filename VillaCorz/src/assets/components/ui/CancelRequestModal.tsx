import { useEffect, useRef, useState } from 'react'
import { Loader2, Paperclip, Send } from 'lucide-react'
import { getApiErrorMessage } from '../../../lib/apiError'
import { requestCancellation } from '../../../services/bookingService'

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const MAX_PROOF_BYTES = 5 * 1024 * 1024

type CancelRequestModalProps = {
    open: boolean
    reference: string
    onClose: () => void
    onSubmitted: () => void
}

const CancelRequestModal = ({
    open,
    reference,
    onClose,
    onSubmitted,
}: CancelRequestModalProps) => {
    const [reason, setReason] = useState('')
    const [proof, setProof] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!open) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !loading) onClose()
        }
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [open, loading, onClose])


    if (!open) return null

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (loading) return
        if (reason.trim().length < 10) {
            setError('Please describe the emergency in at least 10 characters.')
            return
        }
        if (proof && proof.size > MAX_PROOF_BYTES) {
            setError('Proof file must be 5 MB or smaller.')
            return
        }

        setLoading(true)
        setError('')
        try {
            const formData = new FormData()
            formData.append('reason', reason.trim())
            if (proof) formData.append('proof', proof)
            await requestCancellation(reference, formData)
            setSuccess(true)
            onSubmitted()
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError,
                    'Unable to send your cancellation request. Please try again.',
                ),
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) onClose()
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-request-title"
                aria-describedby="cancel-request-description"
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
            >
                <h2
                    id="cancel-request-title"
                    className="text-xl font-bold tracking-tight text-slate-900"
                >
                    Emergency cancellation request
                </h2>
                <p
                    id="cancel-request-description"
                    className="mt-2 text-sm leading-6 text-slate-600"
                >
                    This request will be emailed to customer service for review.
                    You can only use this within 7 days of check-in.
                </p>

                {success ? (
                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        Your request has been sent. We will review it and contact
                        you by email.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                        <div>
                            <label
                                htmlFor="cancel-request-reason"
                                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                            >
                                Reason
                            </label>
                            <textarea
                                id="cancel-request-reason"
                                value={reason}
                                onChange={(event) =>
                                    setReason(event.target.value)
                                }
                                required
                                rows={4}
                                maxLength={2000}
                                placeholder="Describe the emergency and why you need to cancel."
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#0875f9] focus:outline-none focus:ring-2 focus:ring-[#0875f9]/20"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="cancel-request-proof"
                                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                            >
                                Proof (optional)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    id="cancel-request-proof"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    onChange={(event) =>
                                        setProof(
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                    className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                                />
                                {proof && (
                                    <Paperclip
                                        className="size-4 shrink-0 text-slate-400"
                                        aria-hidden="true"
                                    />
                                )}
                            </div>
                            <p className="mt-1 text-[11px] leading-4 text-slate-500">
                                JPG, PNG, WebP or PDF, up to 5 MB.
                                {proof ? ` Selected: ${proof.name}` : ''}
                            </p>
                        </div>

                        {error && (
                            <p
                                role="alert"
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700"
                            >
                                {error}
                            </p>
                        )}

                        <div className="flex flex-col gap-2.5 pt-1">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#006dfc] px-5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(36,107,206,0.18)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 ${focusRing}`}
                            >
                                {loading && (
                                    <Loader2
                                        className="size-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                )}
                                <Send className="size-4" aria-hidden="true" />
                                {loading ? 'Sending…' : 'Send request'}
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
                    </form>
                )}

                {success && (
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`min-h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 ${focusRing}`}
                        >
                            Close
                        </button>
                    </div>
                )}
            </section>
        </div>
    )
}

export default CancelRequestModal