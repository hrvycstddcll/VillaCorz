import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getApiErrorMessage } from '../../../lib/apiError'
import { getBooking } from '../../../services/bookingService'
import {
    confirmPayment,
    getPaymentStatus,
} from '../../../services/paymentService'
import type {
    Booking,
    PaymentConfirmationResult,
} from '../../../services/types'
import paymentConfirmationMascot from '../../mascots/PaymentConfirmation.jpg'
import paymentUnsuccessfulMascot from '../../mascots/PaymentUnsuccessful.jpg'
import interruptedErrorMascot from '../../mascots/Interrupted_Error.jpg'
import emptyMascot from '../../mascots/Empty.jpg'
import PaymentStateModal from '../ui/ModalComponents/PaymentStateModal'
import PaymentSuccessView from './PaymentSuccessView'

const POLL_INTERVAL_MS = 2500

type PaymentModalState =
    | { kind: 'success' }
    | { kind: 'unsuccessful'; message: string }
    | { kind: 'interrupted'; message: string }

const getResultFromError = (error: unknown) =>
    (
        error as {
            response?: { data?: { data?: PaymentConfirmationResult } }
        }
    )?.response?.data?.data ?? null

const Payment = () => {
    const navigate = useNavigate()
    const { reference } = useParams<{ reference: string }>()
    const [booking, setBooking] = useState<Booking | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [modalState, setModalState] = useState<PaymentModalState | null>(null)
    const confirmationResult = useRef<PaymentConfirmationResult | null>(null)

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
            <PaymentStateModal
                image={emptyMascot}
                tone="neutral"
                title="Nothing to confirm"
                description="No booking reference was provided. Return to services to choose a stay."
                primaryLabel="Return to services"
                onPrimary={() => navigate('/services')}
            />
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
            <PaymentStateModal
                image={emptyMascot}
                tone="neutral"
                title="Nothing to confirm"
                description={error || 'This booking could not be found.'}
                primaryLabel="Return to services"
                onPrimary={() => navigate('/services')}
            />
        )
    }

    const payment = booking.payment

    if (!payment) {
        return (
            <PaymentStateModal
                image={emptyMascot}
                tone="neutral"
                title="Payment record missing"
                description="This booking does not have a payment record yet."
                primaryLabel="Return to services"
                onPrimary={() => navigate('/services')}
            />
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

    const applyConfirmationResult = (result: PaymentConfirmationResult) => {
        setBooking((current) => {
            if (!current || !current.payment) return current

            return {
                ...current,
                status: result.booking_status ?? current.status,
                confirmed_at:
                    result.status === 'paid' ? result.paid_at : current.confirmed_at,
                payment: {
                    ...current.payment,
                    status: result.status,
                    paid_at: result.paid_at,
                    is_expired: result.is_expired,
                },
            }
        })
    }

    const handleConfirmPayment = async () => {
        if (!paymentReference) {
            throw new Error('Missing payment reference.')
        }

        const response = await confirmPayment(paymentReference)
        confirmationResult.current = response.data.data
    }

    const handlePaymentConfirmed = () => {
        const result = confirmationResult.current
        confirmationResult.current = null

        if (!result) return

        applyConfirmationResult(result)

        if (
            result.conflict ||
            result.expired ||
            result.status === 'cancelled' ||
            result.status === 'expired' ||
            result.booking_status === 'cancelled' ||
            result.booking_status === 'expired'
        ) {
            setModalState({
                kind: 'unsuccessful',
                message:
                    result.message ||
                    'This reservation is no longer available. Please choose different dates.',
            })
            return
        }

        if (result.status === 'paid') {
            setModalState({ kind: 'success' })
            return
        }

        setModalState({
            kind: 'interrupted',
            message: 'The payment could not be confirmed. Please try again.',
        })
    }

    const handlePaymentError = (reason: unknown) => {
        const result = getResultFromError(reason)

        if (result) {
            confirmationResult.current = result
            handlePaymentConfirmed()
            return
        }

        setModalState({
            kind: 'interrupted',
            message: getApiErrorMessage(
                reason,
                'The payment could not be confirmed. Please try again.',
            ),
        })
    }

    const renderModal = () => {
        if (!modalState) return null

        if (modalState.kind === 'success') {
            return (
                <PaymentStateModal
                    image={paymentConfirmationMascot}
                    tone="success"
                    title="Reservation confirmed"
                    description="Payment received. Your confirmation email is on its way. Present your booking reference when you arrive."
                    details={
                        <>
                            Booking reference
                            <strong className="mt-1 block break-words font-semibold text-slate-800">
                                {booking.reference}
                            </strong>
                        </>
                    }
                    primaryLabel="Return to services"
                    onPrimary={() => {
                        setModalState(null)
                        navigate('/services')
                    }}
                    secondaryLabel="View receipt"
                    onSecondary={() => setModalState(null)}
                />
            )
        }

        if (modalState.kind === 'unsuccessful') {
            return (
                <PaymentStateModal
                    image={paymentUnsuccessfulMascot}
                    tone="danger"
                    title="Payment unsuccessful"
                    description={modalState.message}
                    details={
                        <>
                            Booking reference
                            <strong className="mt-1 block break-words font-semibold text-slate-800">
                                {booking.reference}
                            </strong>
                        </>
                    }
                    primaryLabel="Back to booking"
                    onPrimary={() => {
                        setModalState(null)
                        navigate(-1)
                    }}
                    secondaryLabel="View details"
                    onSecondary={() => setModalState(null)}
                />
            )
        }

        return (
            <PaymentStateModal
                image={interruptedErrorMascot}
                tone="warning"
                title="Payment interrupted"
                description={modalState.message}
                primaryLabel="Try again"
                onPrimary={() => setModalState(null)}
                secondaryLabel="View details"
                onSecondary={() => setModalState(null)}
            />
        )
    }

    return (
        <>
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
                onConfirmPayment={handleConfirmPayment}
                onPaymentConfirmed={handlePaymentConfirmed}
                onPaymentError={handlePaymentError}
            />
            {renderModal()}
        </>
    )
}

export default Payment
