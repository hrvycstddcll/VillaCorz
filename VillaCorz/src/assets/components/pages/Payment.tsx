import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getApiErrorMessage } from '../../../lib/apiError'
import { getBooking } from '../../../services/bookingService'
import { getPaymentStatus } from '../../../services/paymentService'
import type { Booking } from '../../../services/types'
import PaymentSuccessView from './PaymentSuccessView'

const POLL_INTERVAL_MS = 2500

const Payment = () => {
    const navigate = useNavigate()
    const { reference } = useParams<{ reference: string }>()
    const [booking, setBooking] = useState<Booking | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const loadBooking = useCallback(async () => {
        if (!reference) {
            throw new Error('Missing booking reference.')
        }

        const response = await getBooking(reference)
        setBooking(response.data.data)

        return response.data.data
    }, [reference])

    useEffect(() => {
        if (!reference) return

        let active = true

        getBooking(reference)
            .then((response) => {
                if (!active) return
                setBooking(response.data.data)
            })
            .catch((requestError: unknown) => {
                if (!active) return
                setError(
                    getApiErrorMessage(
                        requestError,
                        'Unable to load this booking.',
                    ),
                )
            })
            .finally(() => {
                if (active) setLoading(false)
            })

        return () => {
            active = false
        }
    }, [reference])

    const paymentReference = booking?.payment?.reference
    const paymentStatus = booking?.payment?.status
    const paymentIsExpired = booking?.payment?.is_expired

    useEffect(() => {
        if (
            !paymentReference ||
            paymentStatus === 'paid' ||
            paymentStatus === 'expired' ||
            paymentStatus === 'cancelled' ||
            paymentIsExpired
        ) {
            return
        }

        let active = true

        const applyStatus = (
            status: 'pending' | 'paid' | 'expired' | 'cancelled',
            paidAt: string | null,
            isExpired: boolean,
        ) => {
            setBooking((current) => {
                if (!current || !current.payment) return current

                return {
                    ...current,
                    status:
                        status === 'paid'
                            ? 'confirmed'
                            : status === 'expired'
                              ? 'expired'
                              : status === 'cancelled'
                                ? 'cancelled'
                                : current.status,
                    confirmed_at:
                        status === 'paid'
                            ? paidAt
                            : current.confirmed_at,
                    payment: {
                        ...current.payment,
                        status,
                        paid_at: paidAt,
                        is_expired: isExpired,
                    },
                }
            })
        }

        const poll = async () => {
            try {
                const { data } = await getPaymentStatus(paymentReference)

                if (!active) return

                applyStatus(
                    data.data.status,
                    data.data.paid_at,
                    data.data.is_expired,
                )
            } catch {
                // A transient network error should not stop the polling loop.
            }
        }

        void poll()
        const timer = window.setInterval(() => {
            void poll()
        }, POLL_INTERVAL_MS)

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                void poll()
            }
        }

        document.addEventListener('visibilitychange', handleVisibility)

        return () => {
            active = false
            window.clearInterval(timer)
            document.removeEventListener('visibilitychange', handleVisibility)
        }
    }, [paymentIsExpired, paymentReference, paymentStatus])

    if (!reference) {
        return (
            <main className="grid min-h-dvh place-items-center bg-[#f7f6fa] px-4 py-8 font-poppins">
                <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-[0_3px_12px_rgba(15,23,42,0.08)] sm:p-8">
                    <h1 className="text-xl font-semibold text-rose-800">
                        Unable to open payment
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        No booking reference was provided.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/services')}
                        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#0875f9] px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                        Return to services
                    </button>
                </section>
            </main>
        )
    }

    if (loading) {
        return (
            <main className="grid min-h-dvh place-items-center bg-[#f7f6fa] px-4 py-8 font-poppins">
                <p role="status" aria-live="polite" className="text-sm text-slate-600">
                    Loading your booking…
                </p>
            </main>
        )
    }

    if (!booking) {
        return (
            <main className="grid min-h-dvh place-items-center bg-[#f7f6fa] px-4 py-8 font-poppins">
                <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-[0_3px_12px_rgba(15,23,42,0.08)] sm:p-8">
                    <h1 className="text-xl font-semibold text-rose-800">
                        Unable to open payment
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        {error || 'This booking could not be found.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/services')}
                        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#0875f9] px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                        Return to services
                    </button>
                </section>
            </main>
        )
    }

    const payment = booking.payment

    if (!payment) {
        return (
            <main className="grid min-h-dvh place-items-center bg-[#f7f6fa] px-4 py-8 font-poppins">
                <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-[0_3px_12px_rgba(15,23,42,0.08)] sm:p-8">
                    <h1 className="text-xl font-semibold text-rose-800">
                        Payment record missing
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        This booking does not have a payment record yet.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/services')}
                        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#0875f9] px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                        Return to services
                    </button>
                </section>
            </main>
        )
    }

    const viewStatus =
        payment.status === 'paid'
            ? 'success'
            : payment.status === 'cancelled' || booking.status === 'cancelled'
              ? 'cancelled'
              : payment.status === 'expired' || payment.is_expired
                ? 'expired'
                : 'pending'

    const handleRefresh = async () => {
        try {
            setError('')
            await loadBooking()
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError,
                    'Unable to refresh the payment status.',
                ),
            )
        }
    }

    return (
        <PaymentSuccessView
            status={viewStatus}
            guestName={booking.contact.name}
            email={booking.contact.email}
            phoneNumber={booking.contact.phone ?? ''}
            bookingId={booking.reference}
            qrValue={payment.qr_url}
            checkIn={booking.check_in}
            checkOut={booking.check_out}
            nights={booking.nights}
            rooms={booking.rooms.map((room) => ({
                name: room.name,
                adults: room.adults,
                kids: room.kids,
            }))}
            total={Number(booking.total)}
            error={error}
            onConfirm={() => {
                if (viewStatus === 'success') {
                    navigate('/services')
                } else {
                    navigate(-1)
                }
            }}
            onRefresh={() => {
                void handleRefresh()
            }}
        />
    )
}

export default Payment
