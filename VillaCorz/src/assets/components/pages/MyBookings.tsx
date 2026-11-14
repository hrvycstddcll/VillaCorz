import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../../../lib/apiError'
import { money } from '../../../lib/format'
import {
    cancelBooking,
    getBookings,
} from '../../../services/bookingService'
import type { Booking, BookingRoom, CancellationRequest } from '../../../services/types'
import BackButton from '../ui/BackButton'
import BookingRoomsModal from '../ui/BookingRoomsModal'
import CancelRequestModal from '../ui/CancelRequestModal'

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

    const canCancel = (booking: Booking) => {
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
        <main className="min-h-svh bg-slate-50 px-4 pb-10 pt-8 font-poppins sm:px-6">
            <div className="mx-auto max-w-4xl">
                <BackButton fallback="/services" className="mb-5" />
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">My bookings</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Track, review, or cancel your VillaCorz reservations.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/services')}
                        className="inline-flex min-h-11 items-center rounded-lg bg-[#0875f9] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] transition hover:bg-blue-700"
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
                            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                                activeTab === key
                                    ? 'bg-[#006dfc] text-white'
                                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-[#006dfc]'
                            }`}
                        >
                            {label}
                            <span
                                className={`rounded-full px-1.5 text-[10px] ${
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
                    <p className="text-sm text-slate-500">Loading your bookings…</p>
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
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {visibleBookings.map((booking) => (
                            <li
                                key={booking.reference}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            Reference
                                        </p>
                                        <p className="text-lg font-bold text-[#0875f9]">
                                            {booking.reference}
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
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
                                    {booking.cancellation_request?.status ===
                                        'pending' && (
                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                            Cancellation request pending
                                        </span>
                                    )}
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
                                            className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:border-[#0875f9]/40 hover:text-[#0875f9]"
                                        >
                                            View rooms ({booking.rooms.length})
                                        </button>
                                    </div>
                                </div>

                                {booking.payment?.reference && (
                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                        <span>
                                            Payment ref:{' '}
                                            <span className="font-medium text-slate-700">
                                                {booking.payment.reference}
                                            </span>
                                        </span>
                                        {booking.payment.paid_at && (
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

                                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                                    {canCancel(booking) && (
                                        <button
                                            type="button"
                                            disabled={cancelling === booking.reference}
                                            onClick={() =>
                                                void handleCancel(booking.reference)
                                            }
                                            className="inline-flex min-h-10 items-center rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {cancelling === booking.reference
                                                ? 'Cancelling…'
                                                : 'Cancel booking'}
                                        </button>
                                    )}
                                    {cancellationClosed(booking) &&
                                        !booking.cancellation_request && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setRequestModalRef(
                                                        booking.reference,
                                                    )
                                                }
                                                className="inline-flex min-h-10 items-center rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                                            >
                                                Request emergency cancellation
                                            </button>
                                        )}
                                </div>
                            </li>
                        ))}
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