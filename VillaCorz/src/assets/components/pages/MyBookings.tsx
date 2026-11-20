import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../../../lib/apiError'
import { money } from '../../../lib/format'
import {
    cancelBooking,
    getBookings,
} from '../../../services/bookingService'
import type { Booking, BookingRoom, CancellationRequest } from '../../../services/types'
import BookingRoomsModal from '../ui/ModalComponents/BookingRoomsModal'
import CancelRequestModal from '../ui/ModalComponents/CancelRequestModal'

const formatDate = (value: string) => {
    const date = new Date(`${value}T00:00:00`)
    if (!Number.isFinite(date.getTime())) return value
    return new Intl.DateTimeFormat('en', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date)
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const MyBookings = () => {
    const navigate = useNavigate()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [cancelling, setCancelling] = useState<string | null>(null)
    const [roomsModal, setRoomsModal] = useState<BookingRoom[] | null>(null)
    const [requestModalRef, setRequestModalRef] = useState<string | null>(null)
const [activeTab, setActiveTab] = useState<'all' | 'booked' | 'cancelled' | 'completed'>('all')

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
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const checkIn = new Date(`${booking.check_in}T00:00:00`)
        return checkIn.getTime() - today.getTime() >= SEVEN_DAYS_MS
    }

    const cancellationClosed = (booking: Booking) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const checkIn = new Date(`${booking.check_in}T00:00:00`)
        return checkIn.getTime() - today.getTime() < SEVEN_DAYS_MS
    }

    const reviewWindowOpen = (booking: Booking) => {
        const checkOut = new Date(`${booking.check_out}T00:00:00`)
        if (!Number.isFinite(checkOut.getTime())) return false
        const cutoff = new Date()
        cutoff.setHours(0, 0, 0, 0)
        cutoff.setDate(cutoff.getDate() - 30)
        return checkOut.getTime() >= cutoff.getTime()
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

    const paymentMethodLabel = (booking: Booking) =>
        booking.payment_method || booking.payment?.method || 'Not specified'

    return (
        <main className="min-h-svh bg-slate-50 px-4 pb-28 pt-24 font-poppins sm:px-7 sm:pb-20 sm:pt-28">
            <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
                            My bookings
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Track, review, or cancel your VillaCorz reservations.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/services')}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[#006dfc] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,109,252,0.24)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                    >
                        New booking
                    </button>
                </div>

                <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-600 shadow-sm">
                    Cancellations are only accepted up to 7 days before check-in.
                    For emergencies inside that window, use the request button and
                    our team will review it.
                </div>

                <div
                    role="tablist"
                    aria-label="Booking status"
                    className="mb-4 flex flex-wrap gap-2"
                >
                    {(
                        [
                            { key: 'all', label: 'All' },
                            { key: 'booked', label: 'Booked' },
                            { key: 'cancelled', label: 'Cancelled' },
                            { key: 'completed', label: 'Completed' },
                        ] as const
                    ).map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === key}
                            onClick={() => setActiveTab(key)}
                            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] ${
                                activeTab === key
                                    ? 'bg-[#006dfc] text-white shadow-[0_4px_12px_rgba(0,109,252,0.2)]'
                                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-[#006dfc]'
                            }`}
                        >
                            {label}
                            <span
                                className={`min-w-5 rounded-full px-1.5 text-center text-[10px] font-semibold ${
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
                        className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                    >
                        {error}
                    </div>
                )}

                {loading ? (
                    <div role="status" aria-label="Loading your bookings" className="space-y-4">
                        <span className="sr-only">Loading your bookings…</span>
                        {[0, 1].map((item) => (
                            <div
                                key={item}
                                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="h-4 w-28 rounded bg-slate-200" />
                                    <div className="h-6 w-20 rounded-full bg-slate-200" />
                                </div>
                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    {[0, 1, 2, 3].map((row) => (
                                        <div key={row} className="h-10 rounded-lg bg-slate-100" />
                                    ))}
                                </div>
                                <div className="mt-5 h-10 rounded-lg bg-slate-100" />
                            </div>
                        ))}
                    </div>
                ) : visibleBookings.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <p className="text-base font-semibold text-slate-700">
                            {activeTab === 'all'
                                ? 'No confirmed bookings yet'
                                : `No ${activeTab} bookings`}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                            {activeTab === 'all'
                                ? 'Your confirmed reservations will appear here.'
                                : 'Try another tab to see your other reservations.'}
                        </p>
                        {activeTab === 'all' && (
                            <button
                                type="button"
                                onClick={() => navigate('/services')}
                                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#006dfc] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,109,252,0.24)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                            >
                                Browse rooms
                            </button>
                        )}
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {visibleBookings.map((booking) => {
                            const canReview =
                                booking.lifecycle === 'completed' &&
                                reviewWindowOpen(booking) &&
                                booking.rooms.some(
                                    (room) => room.service_id != null,
                                )
                            const canRequestCancellation =
                                booking.lifecycle === 'booked' &&
                                cancellationClosed(booking) &&
                                !booking.cancellation_request
                            const hasActions =
                                canReview || canCancel(booking) || canRequestCancellation

                            return (
                            <li
                                key={booking.reference}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            Reference
                                        </p>
                                        <p className="text-lg font-bold text-[#006dfc]">
                                            {booking.reference}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                                            booking.lifecycle === 'completed'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : booking.lifecycle === 'cancelled'
                                                  ? 'bg-rose-100 text-rose-700'
                                                  : booking.lifecycle === 'booked'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-amber-100 text-amber-700'
                                        }`}
                                    >
                                        {booking.lifecycle === 'booked'
                                            ? 'Booked'
                                            : booking.lifecycle === 'completed'
                                              ? 'Completed'
                                              : booking.lifecycle === 'cancelled'
                                                ? 'Cancelled'
                                                : booking.lifecycle === 'expired'
                                                  ? 'Expired'
                                                  : 'Pending'}
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs text-slate-500">Check-in</p>
                                        <p className="font-semibold text-slate-800">
                                            {formatDate(booking.check_in)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Check-out</p>
                                        <p className="font-semibold text-slate-800">
                                            {formatDate(booking.check_out)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Stay</p>
                                        <p className="font-semibold text-slate-800">
                                            {booking.nights} night{booking.nights === 1 ? '' : 's'} ·{' '}
                                            {booking.adults + booking.kids} guest
                                            {booking.adults + booking.kids === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Total</p>
                                        <p className="font-semibold text-slate-800">
                                            {money(Number(booking.total))}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">
                                            Mode of payment
                                        </p>
                                        <p className="font-semibold text-slate-800">
                                            {paymentMethodLabel(booking)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Rooms</p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRoomsModal(booking.rooms)
                                            }
                                            className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:border-[#006dfc]/40 hover:text-[#006dfc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                        >
                                            View rooms ({booking.rooms.length})
                                        </button>
                                    </div>
                                </div>

                                {(booking.payment?.reference ||
                                    booking.cancellation_request?.status ===
                                        'pending') && (
                                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                                        {booking.cancellation_request?.status ===
                                            'pending' && (
                                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                                Cancellation request pending
                                            </span>
                                        )}
                                        {booking.payment?.reference && (
                                            <span>
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
                                                    {formatDate(
                                                        booking.payment.paid_at.slice(
                                                            0,
                                                            10,
                                                        ),
                                                    )}
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

                                {hasActions && (
                                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                                        {canReview && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    goToReview(booking)
                                                }
                                                className="inline-flex min-h-11 items-center rounded-lg bg-[#006dfc] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,109,252,0.24)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                            >
                                                Leave a review
                                            </button>
                                        )}
                                        {canCancel(booking) && (
                                            <button
                                                type="button"
                                                disabled={cancelling === booking.reference}
                                                onClick={() =>
                                                    void handleCancel(booking.reference)
                                                }
                                                className="inline-flex min-h-11 items-center rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {cancelling === booking.reference
                                                    ? 'Cancelling…'
                                                    : 'Cancel booking'}
                                            </button>
                                        )}
                                        {canRequestCancellation && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setRequestModalRef(
                                                        booking.reference,
                                                    )
                                                }
                                                className="inline-flex min-h-11 items-center rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                            >
                                                Request emergency cancellation
                                            </button>
                                        )}
                                    </div>
                                )}
                            </li>
                            )
                        })}
                    </ul>
                )}

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