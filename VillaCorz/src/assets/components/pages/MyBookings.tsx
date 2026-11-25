import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { getApiErrorMessage } from '../../../lib/apiError'
import { money } from '../../../lib/format'
import { formatPaidDays, formatStayDateTime } from '../../../lib/stayDateTime'
import {
    cancelBooking,
    getBookings,
} from '../../../services/bookingService'
import type { Booking, BookingRoom, CancellationRequest } from '../../../services/types'
import BookingRoomsModal from '../ui/ModalComponents/BookingRoomsModal'
import CancelRequestModal from '../ui/ModalComponents/CancelRequestModal'
import { stateMascots } from '../ui/ModalComponents/stateModalConfig'

const formatDate = (value: string) =>
    formatStayDateTime(value, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const TABS = [
    { key: 'all', label: 'All' },
    { key: 'booked', label: 'Booked' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'completed', label: 'Completed' },
] as const

const stayLengthLabel = (booking: Booking) =>
    booking.paid_days != null
        ? formatPaidDays(booking.paid_days)
        : `${booking.nights} night${booking.nights === 1 ? '' : 's'}`

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const labelClass =
    'text-[10px] font-semibold uppercase leading-4 tracking-[0.12em] text-slate-500'

const valueClass =
    'mt-0.5 text-[13px] font-medium leading-[1.4] text-slate-800 tabular-nums'

const primaryButtonClass = `inline-flex min-h-11 items-center justify-center rounded-lg bg-[#006dfc] px-3.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(0,109,252,0.18)] transition-[background-color,color,box-shadow] duration-150 hover:bg-blue-700 motion-reduce:transition-none sm:px-4 ${focusRing}`

const secondaryButtonClass = `inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-700 transition-[background-color,border-color,color] duration-150 hover:border-[#006dfc]/40 hover:text-[#006dfc] motion-reduce:transition-none sm:text-[13px] ${focusRing}`

type LifecycleMeta = {
    label: string
    dot: string
    text: string
    detail: string
}

const lifecycleMetaFor = (booking: Booking): LifecycleMeta => {
    if (booking.lifecycle === 'booked') {
        return {
            label: 'Booked',
            dot: 'bg-blue-500',
            text: 'text-blue-700',
            detail: 'Your stay is confirmed. Review details below or manage it before check-in.',
        }
    }
    if (booking.lifecycle === 'completed') {
        return {
            label: 'Completed',
            dot: 'bg-emerald-500',
            text: 'text-emerald-700',
            detail: 'This stay is complete.',
        }
    }
    if (booking.lifecycle === 'cancelled') {
        return {
            label: 'Cancelled',
            dot: 'bg-rose-500',
            text: 'text-rose-700',
            detail: 'This reservation has been cancelled.',
        }
    }
    if (booking.lifecycle === 'expired') {
        return {
            label: 'Expired',
            dot: 'bg-slate-400',
            text: 'text-slate-600',
            detail: 'This reservation expired and is no longer active.',
        }
    }
    return booking.status === 'pending_payment'
        ? {
              label: 'Pending payment',
              dot: 'bg-amber-500',
              text: 'text-amber-700',
              detail: 'Payment is still required to confirm this reservation.',
          }
        : {
              label: 'Pending',
              dot: 'bg-amber-500',
              text: 'text-amber-700',
              detail: 'This reservation is still being processed.',
          }
}

const paymentMethodLabel = (booking: Booking) =>
    booking.payment_method || booking.payment?.method || 'Not specified'

const DetailField = ({
    label,
    children,
}: {
    label: string
    children: ReactNode
}) => (
    <div className="min-w-0">
        <p className={labelClass}>{label}</p>
        {children}
    </div>
)

type BookingCardProps = {
    booking: Booking
    cancelling: boolean
    canReview: boolean
    canCancel: boolean
    canRequestCancellation: boolean
    onCancel: () => void
    onOpenRooms: () => void
    onReview: () => void
    onContinuePayment: () => void
    onRequestCancellation: () => void
}

const BookingCard = ({
    booking,
    cancelling,
    canReview,
    canCancel,
    canRequestCancellation,
    onCancel,
    onOpenRooms,
    onReview,
    onContinuePayment,
    onRequestCancellation,
}: BookingCardProps) => {
    const [detailsOpen, setDetailsOpen] = useState(false)
    const detailsId = useId()
    const meta = lifecycleMetaFor(booking)
    const hasActions =
        canReview ||
        booking.status === 'pending_payment' ||
        canCancel ||
        canRequestCancellation
    const hasMeta =
        Boolean(booking.payment?.reference) ||
        booking.cancellation_request?.status === 'pending'

    return (
        <li className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className={labelClass}>Reference</p>
                    <p className="break-words text-[clamp(0.9375rem,3.6vw,1.0625rem)] font-bold leading-[1.25] tracking-[-0.01em] text-[#006dfc] tabular-nums">
                        {booking.reference}
                    </p>
                    <p className="mt-1 text-[11px] leading-[1.5] text-slate-500 sm:hidden tabular-nums">
                        {formatDate(booking.check_in)} · {money(Number(booking.total))}
                    </p>
                    <p className="mt-1 hidden text-[12px] leading-[1.5] text-slate-500 text-pretty sm:block">
                        {meta.detail}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${meta.text}`}
                    >
                        <span
                            className={`size-1.5 rounded-full ${meta.dot}`}
                            aria-hidden="true"
                        />
                        {meta.label}
                    </span>
                    <button
                        type="button"
                        aria-expanded={detailsOpen}
                        aria-controls={detailsId}
                        aria-label={`${detailsOpen ? 'Hide' : 'Show'} booking details for ${booking.reference}`}
                        onClick={() => setDetailsOpen((open) => !open)}
                        className={`grid size-11 place-items-center rounded-lg text-slate-500 transition-[background-color,color] duration-150 hover:bg-slate-50 hover:text-[#006dfc] motion-reduce:transition-none md:hidden ${focusRing}`}
                    >
                        <ChevronDown
                            className={`size-4 transition-transform duration-150 motion-reduce:transition-none ${detailsOpen ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </div>

            <div
                id={detailsId}
                className={`mt-4 ${detailsOpen ? 'block' : 'hidden md:block'}`}
            >
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField label="Check-in">
                        <p className={valueClass}>{formatDate(booking.check_in)}</p>
                    </DetailField>
                    <DetailField label="Check-out">
                        <p className={valueClass}>{formatDate(booking.check_out)}</p>
                    </DetailField>
                    <DetailField label="Stay">
                        <p className={valueClass}>
                            {stayLengthLabel(booking)} ·{' '}
                            {booking.adults + booking.kids} guest
                            {booking.adults + booking.kids === 1 ? '' : 's'}
                        </p>
                    </DetailField>
                    <DetailField label="Total">
                        <p className={valueClass}>{money(Number(booking.total))}</p>
                    </DetailField>
                    <DetailField label="Mode of payment">
                        <p className={`${valueClass} break-words`}>
                            {paymentMethodLabel(booking)}
                        </p>
                    </DetailField>
                    <DetailField label="Rooms">
                        <button
                            type="button"
                            onClick={onOpenRooms}
                            className={`mt-0.5 ${secondaryButtonClass}`}
                        >
                            View rooms ({booking.rooms.length})
                        </button>
                    </DetailField>
                </div>

                {hasMeta && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] leading-[1.5] text-slate-500 tabular-nums">
                        {booking.cancellation_request?.status === 'pending' && (
                            <span className="font-semibold text-amber-700">
                                Cancellation request pending
                            </span>
                        )}
                        {booking.payment?.reference && (
                            <span className="break-words">
                                Payment ref:{' '}
                                <span className="font-medium text-slate-700">
                                    {booking.payment.reference}
                                </span>
                            </span>
                        )}
                        {booking.payment?.paid_at && (
                            <span>
                                Paid:{' '}
                                <span className="font-medium text-slate-700">
                                    {formatDate(booking.payment.paid_at)}
                                </span>
                            </span>
                        )}
                        {booking.confirmation_email_sent_at && (
                            <span className="text-emerald-600">
                                Confirmation email sent
                            </span>
                        )}
                    </div>
                )}
            </div>

            {hasActions && (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    {canReview && (
                        <button
                            type="button"
                            onClick={onReview}
                            className={primaryButtonClass}
                        >
                            Leave a review
                        </button>
                    )}
                    {booking.status === 'pending_payment' && (
                        <button
                            type="button"
                            onClick={onContinuePayment}
                            className={primaryButtonClass}
                        >
                            Continue payment
                        </button>
                    )}
                    {canCancel && (
                        <button
                            type="button"
                            disabled={cancelling}
                            onClick={onCancel}
                            className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-[12px] font-semibold text-rose-700 transition-[background-color,border-color,color] duration-150 hover:bg-rose-100 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-[13px] sm:px-4 ${focusRing}`}
                        >
                            {cancelling ? 'Cancelling…' : 'Cancel booking'}
                        </button>
                    )}
                    {canRequestCancellation && (
                        <button
                            type="button"
                            onClick={onRequestCancellation}
                            className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-[12px] font-semibold text-amber-700 transition-[background-color,border-color,color] duration-150 hover:bg-amber-100 motion-reduce:transition-none sm:text-[13px] sm:px-4 ${focusRing}`}
                        >
                            Request emergency cancellation
                        </button>
                    )}
                </div>
            )}
        </li>
    )
}

const MyBookings = () => {
    const navigate = useNavigate()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [cancelling, setCancelling] = useState<string | null>(null)
    const [roomsModal, setRoomsModal] = useState<BookingRoom[] | null>(null)
    const [requestModalRef, setRequestModalRef] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'all' | 'booked' | 'cancelled' | 'completed'>('all')
    const [visibleCount, setVisibleCount] = useState(8)
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

    useEffect(() => {
        let active = true
        getBookings()
            .then(({ data }) => {
                if (active) setBookings(data.data ?? [])
            })
            .catch((requestError) => {
                if (active) {
                    setError(
                        getApiErrorMessage(
                            requestError,
                            'Unable to load your bookings.',
                        ),
                    )
                }
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [])

    const counts = useMemo(() => {
        const c = { all: bookings.length, booked: 0, cancelled: 0, completed: 0 }
        for (const b of bookings) {
            if (b.lifecycle === 'booked') c.booked++
            else if (b.lifecycle === 'cancelled') c.cancelled++
            else if (b.lifecycle === 'completed') c.completed++
        }
        return c
    }, [bookings])

    const visibleBookings = useMemo(() => {
        if (activeTab === 'all') return bookings
        if (activeTab === 'booked') return bookings.filter((b) => b.lifecycle === 'booked')
        if (activeTab === 'cancelled') return bookings.filter((b) => b.lifecycle === 'cancelled')
        return bookings.filter((b) => b.lifecycle === 'completed')
    }, [bookings, activeTab])

    const pagedBookings = useMemo(
        () => visibleBookings.slice(0, visibleCount),
        [visibleBookings, visibleCount],
    )

    const handleCancel = async (reference: string) => {
        if (!window.confirm('Cancel this booking? This cannot be undone.')) return
        setCancelling(reference)
        setError('')
        try {
            await cancelBooking(reference)
            setBookings((current) =>
                current.filter((booking) => booking.reference !== reference),
            )
        } catch (requestError) {
            setError(
                getApiErrorMessage(requestError, 'Unable to cancel this booking.'),
            )
        } finally {
            setCancelling(null)
        }
    }

    const isCancellable = (booking: Booking) =>
        booking.lifecycle === 'booked' || booking.lifecycle === 'pending'

    const canCancel = (booking: Booking) => {
        // Cancelled, expired and completed stays can never be cancelled again.
        if (!isCancellable(booking)) return false

        // A booking that has not been paid yet can be cancelled at any time.
        if (booking.status === 'pending_payment') return true

        const checkIn = Date.parse(booking.check_in)
        return (
            Number.isFinite(checkIn) &&
            checkIn - new Date().getTime() >= SEVEN_DAYS_MS
        )
    }

    const cancellationClosed = (booking: Booking) => {
        const checkIn = Date.parse(booking.check_in)
        return (
            !Number.isFinite(checkIn) ||
            checkIn - new Date().getTime() < SEVEN_DAYS_MS
        )
    }

    const reviewWindowOpen = (booking: Booking) => {
        const checkOut = Date.parse(booking.check_out)
        if (!Number.isFinite(checkOut)) return false
        return checkOut >= new Date().getTime() - 30 * 24 * 60 * 60 * 1000
    }

    const goToReview = (booking: Booking) => {
        const serviceId = booking.rooms.find(
            (room) => room.service_id != null,
        )?.service_id
        if (serviceId == null) return
        navigate('/services', { state: { reviewServiceId: serviceId } })
    }

    const handleRequestSubmitted = (reference: string) => {
        setBookings((current) =>
            current.map((booking) =>
                booking.reference === reference
                    ? {
                          ...booking,
                          cancellation_request: {
                              id: 0,
                              status: 'pending',
                              reason: '',
                              requested_at: new Date().toISOString(),
                          } as CancellationRequest,
                      }
                    : booking,
            ),
        )
    }

    const selectTab = (key: (typeof TABS)[number]['key']) => {
        setActiveTab(key)
        setVisibleCount(8)
    }

    const handleTabKeyDown = (
        event: React.KeyboardEvent<HTMLButtonElement>,
        index: number,
    ) => {
        const last = TABS.length - 1
        let next = index
        if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
        else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = last
        else return
        event.preventDefault()
        selectTab(TABS[next].key)
        tabRefs.current[next]?.focus()
    }

    return (
        <main className="min-h-svh bg-slate-50 px-4 pb-28 pt-24 font-jakarta text-slate-800 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8">
            <div className="mx-auto max-w-4xl">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-balance text-[clamp(1.125rem,4.5vw,1.5rem)] font-bold leading-[1.2] tracking-[-0.02em] text-slate-900">
                            My bookings
                        </h1>
                        <p className="mt-1 text-pretty text-[12px] leading-[1.5] text-slate-500 sm:text-[13px]">
                            Track, review, or cancel your VillaCorz reservations.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/services')}
                        className={`${primaryButtonClass} shrink-0`}
                    >
                        New booking
                    </button>
                </div>

                <div className="mb-4 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-[12px] leading-[1.5] text-slate-600 text-pretty">
                    Cancellations are only accepted up to 7 days before check-in.
                    For emergencies inside that window, use the request button and
                    our team will review it.
                </div>

                <div
                    role="tablist"
                    aria-label="Booking status"
                    className="hide-scrollbar mb-4 flex gap-1.5 overflow-x-auto sm:gap-2"
                >
                    {TABS.map(({ key, label }, index) => (
                        <button
                            key={key}
                            ref={(node) => {
                                tabRefs.current[index] = node
                            }}
                            id={`bookings-tab-${key}`}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === key}
                            aria-controls="bookings-panel"
                            tabIndex={activeTab === key ? 0 : -1}
                            onClick={() => selectTab(key)}
                            onKeyDown={(event) => handleTabKeyDown(event, index)}
                            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition-colors duration-150 motion-reduce:transition-none sm:px-4 sm:text-[13px] ${focusRing} ${
                                activeTab === key
                                    ? 'bg-[#006dfc] text-white shadow-[0_2px_8px_rgba(0,109,252,0.18)]'
                                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-[#006dfc]'
                            }`}
                        >
                            {label}
                            <span
                                className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums ${
                                    activeTab === key
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-100 text-slate-500'
                                }`}
                            >
                                {counts[key]}
                            </span>
                        </button>
                    ))}
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] leading-[1.5] text-rose-700"
                    >
                        {error}
                    </div>
                )}

                <div
                    id="bookings-panel"
                    role="tabpanel"
                    aria-labelledby={`bookings-tab-${activeTab}`}
                    tabIndex={0}
                    className={focusRing}
                >
                    {loading ? (
                    <div role="status" aria-label="Loading your bookings" className="space-y-3 sm:space-y-4">
                        <span className="sr-only">Loading your bookings…</span>
                        {[0, 1, 2].map((item) => (
                            <div
                                key={item}
                                className="animate-pulse rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="h-2.5 w-20 rounded bg-slate-200" />
                                        <div className="mt-2 h-4 w-36 rounded bg-slate-200" />
                                        <div className="mt-2 h-2.5 w-full max-w-xs rounded bg-slate-100" />
                                    </div>
                                    <div className="h-4 w-20 shrink-0 rounded bg-slate-200" />
                                </div>
                                <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {[0, 1, 2, 3, 4, 5].map((row) => (
                                        <div key={row} className="space-y-1.5">
                                            <div className="h-2.5 w-16 rounded bg-slate-100" />
                                            <div className="h-4 w-28 rounded bg-slate-200" />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                                    <div className="h-10 w-32 rounded-lg bg-slate-100" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : visibleBookings.length === 0 ? (
                    <div className="rounded-xl border border-slate-200/80 bg-white p-6 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-8">
                        <img
                            src={stateMascots.empty}
                            alt=""
                            aria-hidden="true"
                            className="mx-auto size-16 object-contain sm:size-20"
                            loading="lazy"
                            decoding="async"
                        />
                        <p className="text-balance text-[15px] font-semibold text-slate-700 sm:text-base">
                            {activeTab === 'all'
                                ? 'No confirmed bookings yet'
                                : `No ${activeTab} bookings`}
                        </p>
                        <p className="mt-1.5 text-pretty text-[12px] leading-[1.5] text-slate-500 sm:text-[13px]">
                            {activeTab === 'all'
                                ? 'Your confirmed reservations will appear here.'
                                : 'Try another tab to see your other reservations.'}
                        </p>
                        {activeTab === 'all' && (
                            <button
                                type="button"
                                onClick={() => navigate('/services')}
                                className={`${primaryButtonClass} mt-4`}
                            >
                                Browse rooms
                            </button>
                        )}
                    </div>
                ) : (
                    <ul className="space-y-3 sm:space-y-4">
                        {pagedBookings.map((booking) => (
                            <BookingCard
                                key={booking.reference}
                                booking={booking}
                                cancelling={cancelling === booking.reference}
                                canReview={
                                    booking.lifecycle === 'completed' &&
                                    reviewWindowOpen(booking) &&
                                    booking.rooms.some(
                                        (room) => room.service_id != null,
                                    )
                                }
                                canCancel={canCancel(booking)}
                                canRequestCancellation={
                                    booking.lifecycle === 'booked' &&
                                    cancellationClosed(booking) &&
                                    !booking.cancellation_request
                                }
                                onCancel={() => void handleCancel(booking.reference)}
                                onOpenRooms={() => setRoomsModal(booking.rooms)}
                                onReview={() => goToReview(booking)}
                                onContinuePayment={() =>
                                    navigate(`/payment/${booking.reference}`)
                                }
                                onRequestCancellation={() =>
                                    setRequestModalRef(booking.reference)
                                }
                            />
                        ))}
                    </ul>
                )}
                    {!loading && visibleBookings.length > visibleCount && (
                        <div className="mt-4 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setVisibleCount((count) => count + 8)}
                                className={`${secondaryButtonClass} sm:px-5`}
                            >
                                Show more bookings ({visibleBookings.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}
                </div>

                {roomsModal && (
                    <BookingRoomsModal
                        rooms={roomsModal}
                        onClose={() => setRoomsModal(null)}
                    />
                )}

                {requestModalRef && (
                    <CancelRequestModal
                        open={true}
                        reference={requestModalRef}
                        onClose={() => setRequestModalRef(null)}
                        onSubmitted={() =>
                            handleRequestSubmitted(requestModalRef)
                        }
                    />
                )}
            </div>
        </main>
    )
}

export default MyBookings