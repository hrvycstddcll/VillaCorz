import { useEffect } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'

type ConfirmDialogProps = {
    title: string
    description: string
    confirmLabel: string
    cancelLabel?: string
    loading?: boolean
    error?: string
    onCancel: () => void
    onConfirm: () => void
}

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const ConfirmDialog = ({
    title,
    description,
    confirmLabel,
    cancelLabel = 'Cancel',
    loading = false,
    error,
    onCancel,
    onConfirm,
}: ConfirmDialogProps) => {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !loading) {
                onCancel()
            }
        }

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [loading, onCancel])

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) {
                    onCancel()
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
            >
                <div className="flex items-start justify-between gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
                        <AlertTriangle className="size-5" aria-hidden="true" />
                    </span>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        aria-label="Close dialog"
                        className={`inline-grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 ${focusRing}`}
                    >
                        <X className="size-4" aria-hidden="true" />
                    </button>
                </div>

                <h2
                    id="confirm-dialog-title"
                    className="mt-4 font-serif text-2xl font-bold text-[#003079]"
                >
                    {title}
                </h2>
                <p
                    id="confirm-dialog-description"
                    className="mt-2 text-sm leading-6 text-slate-600"
                >
                    {description}
                </p>

                {error && (
                    <p
                        role="alert"
                        className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700"
                    >
                        {error}
                    </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className={`inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 ${focusRing}`}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                    >
                        {loading && (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        )}
                        {loading ? 'Deleting…' : confirmLabel}
                    </button>
                </div>
            </section>
        </div>
    )
}

export default ConfirmDialog
