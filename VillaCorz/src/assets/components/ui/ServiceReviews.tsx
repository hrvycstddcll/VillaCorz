/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Star, Trash2, X } from 'lucide-react'
import {
    createServiceReview,
    updateServiceReview,
    deleteServiceReview,
    getServiceReviews,
    canReviewService,
} from '../../../services/serviceService'
import { useAuth } from '../../../services/useAuth'
import type { ServiceReview } from '../../../services/types'

type Props = {
    serviceId: number
    averageRating: number | null
    reviewsCount: number
}

const StarRow = ({
    value,
    onChange,
    size = 'md',
}: {
    value: number
    onChange?: (n: number) => void
    size?: 'sm' | 'md'
}) => {
    const cls = size === 'sm' ? 'size-4' : 'size-5'
    return (
        <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={value === n}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    onClick={() => onChange?.(n)}
                    disabled={!onChange}
                    className={`transition ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                >
                    <Star
                        className={`${cls} ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                        aria-hidden="true"
                    />
                </button>
            ))}
        </div>
    )
}

const formatDate = (value: string | null) => {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const ServiceReviews = ({ serviceId, averageRating, reviewsCount }: Props) => {
    const { user } = useAuth()
    const [reviews, setReviews] = useState<ServiceReview[]>([])
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [total, setTotal] = useState(reviewsCount)
    const [avg, setAvg] = useState<number | null>(averageRating)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [eligible, setEligible] = useState<boolean | null>(null)
    const [reason, setReason] = useState<string | null>(null)
    const [rating, setRating] = useState(5)
    const [title, setTitle] = useState('')
    const [comment, setComment] = useState('')
    const [files, setFiles] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const myReview = useMemo(
        () => (user ? reviews.find((r) => r.author === `${user.firstname} ${user.lastname}`.trim()) : undefined),
        [reviews, user],
    )

    const loadReviews = async (nextPage = 1) => {
        setLoading(true)
        setError('')
        try {
            const res = await getServiceReviews(serviceId, nextPage)
            setReviews(res.data.data)
            setPage(res.data.meta.current_page)
            setLastPage(res.data.meta.last_page)
            setTotal(res.data.meta.total)
            setAvg(res.data.meta.average_rating)
        } catch {
            setError('Unable to load reviews.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadReviews(1)
    }, [serviceId])

    useEffect(() => {
        if (!user) {
            setEligible(false)
            setReason('Sign in to leave a review.')
            return
        }
        let active = true
        canReviewService(serviceId)
            .then((res) => {
                if (!active) return
                setEligible(res.data.data.eligible)
                setReason(res.data.data.reason)
            })
            .catch(() => {
                if (active) {
                    setEligible(false)
                    setReason('Unable to check review eligibility.')
                }
            })
        return () => {
            active = false
        }
    }, [serviceId, user])

    useEffect(() => {
        const urls = files.map((f) => URL.createObjectURL(f))
        setPreviews(urls)
        return () => urls.forEach((u) => URL.revokeObjectURL(u))
    }, [files])

    const resetForm = () => {
        setRating(myReview?.rating ?? 5)
        setTitle(myReview?.title ?? '')
        setComment(myReview?.comment ?? '')
        setFiles([])
        setFormError('')
    }

    useEffect(() => {
        if (showForm) resetForm()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showForm, myReview])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError('')
        const fd = new FormData()
        fd.append('rating', String(rating))
        if (title.trim()) fd.append('title', title.trim())
        if (comment.trim()) fd.append('comment', comment.trim())
        files.forEach((f) => fd.append('images[]', f))

        setSubmitting(true)
        try {
            if (myReview) {
                await updateServiceReview(myReview.id, fd)
            } else {
                await createServiceReview(serviceId, fd)
            }
            setShowForm(false)
            await loadReviews(1)
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
                    ?.response?.data?.message ||
                Object.values(
                    (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors ?? {},
                )[0]?.[0] ||
                'Unable to save review.'
            setFormError(msg)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (review: ServiceReview) => {
        if (!window.confirm('Delete this review?')) return
        try {
            await deleteServiceReview(review.id)
            await loadReviews(page)
        } catch {
            setError('Unable to delete review.')
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files ?? [])
        setFiles((prev) => [...prev, ...picked].slice(0, 5))
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    }

    return (
        <section className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <StarRow value={Math.round(avg ?? 0)} size="sm" />
                    <span className="text-sm font-semibold text-slate-800">
                        {avg ? avg.toFixed(1) : '—'}
                    </span>
                    <span className="text-xs text-slate-500">
                        ({total} review{total === 1 ? '' : 's'})
                    </span>
                </div>
                {user && eligible && (
                    <button
                        type="button"
                        onClick={() => setShowForm((v) => !v)}
                        className="rounded-lg bg-[#006dfc] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                    >
                        {showForm ? 'Cancel' : myReview ? 'Edit your review' : 'Write a review'}
                    </button>
                )}
            </div>

            {user && !eligible && reason && (
                <p className="mt-2 text-xs text-slate-500">{reason}</p>
            )}

            {showForm && (
                <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                            Rating
                        </label>
                        <StarRow value={rating} onChange={setRating} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                            Title (optional)
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={120}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/25"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                            Your experience
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/25"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                            Photos (optional, up to 5)
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handleFileChange}
                            className="text-sm"
                        />
                        {previews.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {previews.map((src, i) => (
                                    <div key={src} className="relative">
                                        <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeFile(i)}
                                            aria-label="Remove photo"
                                            className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 shadow ring-1 ring-slate-200"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {formError && <p className="text-xs text-rose-600">{formError}</p>}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-[#006dfc] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                    >
                        {submitting ? 'Saving…' : myReview ? 'Update review' : 'Submit review'}
                    </button>
                </form>
            )}

            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

            {loading ? (
                <p className="mt-3 text-xs text-slate-500">Loading reviews…</p>
            ) : reviews.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">No reviews yet. Be the first!</p>
            ) : (
                <ul className="mt-3 space-y-3">
                    {reviews.map((review) => (
                        <li key={review.id} className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <StarRow value={review.rating} size="sm" />
                                    <span className="text-xs font-semibold text-slate-800">{review.author}</span>
                                    {review.verified && (
                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                            Verified stay
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400">{formatDate(review.created_at)}</span>
                                    {(user?.role === 'admin' || review.author === `${user?.firstname} ${user?.lastname}`.trim()) && (
                                        <button
                                            type="button"
                                            onClick={() => void handleDelete(review)}
                                            aria-label="Delete review"
                                            className="text-slate-400 transition hover:text-rose-600"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {review.title && (
                                <p className="mt-1 text-sm font-semibold text-slate-800">{review.title}</p>
                            )}
                            {review.comment && (
                                <p className="mt-1 text-sm leading-5 text-slate-600">{review.comment}</p>
                            )}
                            {review.images.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {review.images.map((img) => (
                                        <img
                                            key={img.id}
                                            src={img.url}
                                            alt=""
                                            className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
                                        />
                                    ))}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {lastPage > 1 && (
                <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => void loadReviews(page - 1)}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-40"
                    >
                        Prev
                    </button>
                    <span className="text-xs text-slate-500">
                        {page} / {lastPage}
                    </span>
                    <button
                        type="button"
                        disabled={page >= lastPage}
                        onClick={() => void loadReviews(page + 1)}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            )}
        </section>
    )
}

export default ServiceReviews
