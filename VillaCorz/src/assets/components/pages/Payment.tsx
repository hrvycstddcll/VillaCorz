import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getReservationPrice } from '../../../lib/reservation'
import PaymentSuccessView from './PaymentSuccessView'

type PaymentState = {
    bookingId?: string
    checkIn: string
    checkOut: string
    roomGuests: { stayId: string | null; adults: number; kids: number }[]
    roomChoices: { id: string; title: string; price: number; weekendPrice?: number }[]
    firstName?: string
    lastName?: string
    email?: string
    phoneNumber?: string
    paymentMethod?: string
}

type ScanState = 'success' | 'invalid'

const demoPaymentChannel = (bookingId: string) =>
    `villacorz.demo-payment.${bookingId}`

const Payment = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const state = (location.state as PaymentState | null) ?? null
    const isScanConfirmation = location.pathname === '/payment/confirm'
    const scanBookingId = new URLSearchParams(location.search).get('bookingId')
    const [generatedBookingId] = useState(() => window.crypto.randomUUID())
    const bookingId = state?.bookingId ?? generatedBookingId
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success'>(
        'pending',
    )

    useEffect(() => {
        if (!isScanConfirmation || !scanBookingId) return

        if (typeof BroadcastChannel === 'undefined') return
        const channel = new BroadcastChannel(demoPaymentChannel(scanBookingId))
        channel.postMessage('success')
        channel.close()
    }, [isScanConfirmation, scanBookingId])

    useEffect(() => {
        if (!state || isScanConfirmation || typeof BroadcastChannel === 'undefined') {
            return
        }

        const channel = new BroadcastChannel(demoPaymentChannel(bookingId))
        const handleMessage = (event: MessageEvent) => {
            if (event.data === 'success') {
                setPaymentStatus('success')
            }
        }

        channel.addEventListener('message', handleMessage)
        return () => channel.close()
    }, [bookingId, isScanConfirmation, state])

    useEffect(() => {
        if (!state && !isScanConfirmation) {
            navigate('/services', { replace: true })
        }
    }, [isScanConfirmation, navigate, state])

    if (isScanConfirmation) {
        const visibleScanState: ScanState = scanBookingId ? 'success' : 'invalid'
        const message = {
            success: 'The QR was opened and this demo booking is marked successful.',
            invalid: 'This QR link is missing a booking reference.',
        }[visibleScanState]

        return (
            <main className="grid min-h-svh place-items-center bg-slate-50 px-4 py-10 font-poppins">
                <section
                    aria-labelledby="scan-confirmation-title"
                    className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-[0_8px_28px_rgba(15,23,42,0.12)] sm:p-8"
                >
                    <h1
                        id="scan-confirmation-title"
                        className={`text-xl font-bold ${
                            visibleScanState === 'success'
                                ? 'text-emerald-700'
                                : visibleScanState === 'invalid'
                                  ? 'text-rose-700'
                                  : 'text-slate-800'
                        }`}
                    >
                        {visibleScanState === 'success'
                            ? 'Demo payment successful'
                            : 'Unable to confirm scan'}
                    </h1>
                    <p role="status" className="mt-2 text-sm leading-6 text-slate-600">
                        {message}
                    </p>
                    {scanBookingId && (
                        <p className="mt-3 text-xs text-slate-500">
                            Booking reference: {scanBookingId}
                        </p>
                    )}
                    <p className="mt-4 text-xs leading-5 text-amber-800">
                        Demo only. No real payment was processed or verified.
                    </p>
                    <Link
                        to="/services"
                        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#0875f9] px-5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                        Return to services
                    </Link>
                </section>
            </main>
        )
    }

    if (!state) return null

    const assignedRooms = state.roomGuests.flatMap((room) => {
        const stay = state.roomChoices.find((choice) => choice.id === room.stayId)
        return stay ? [{ room, stay }] : []
    })

    const nights = Math.max(
        1,
        Math.round(
            (new Date(`${state.checkOut}T00:00:00`).getTime() -
                new Date(`${state.checkIn}T00:00:00`).getTime()) /
                86_400_000,
        ),
    )

    const total = assignedRooms.reduce(
        (sum, { stay }) =>
            sum + getReservationPrice(stay, state.checkIn, state.checkOut).total,
        0,
    )
    const qrUrl = new URL('/payment/confirm', window.location.origin)
    qrUrl.searchParams.set('bookingId', bookingId)

    return (
        <PaymentSuccessView
            status={paymentStatus}
            firstName={state.firstName ?? ''}
            lastName={state.lastName ?? ''}
            email={state.email ?? ''}
            phoneNumber={state.phoneNumber ?? ''}
            bookingId={bookingId}
            qrValue={qrUrl.toString()}
            checkIn={state.checkIn}
            checkOut={state.checkOut}
            nights={nights}
            rooms={assignedRooms.map(({ room, stay }) => ({
                name: stay.title,
                adults: room.adults,
                kids: room.kids,
            }))}
            total={total}
            onConfirm={() => {
                if (paymentStatus === 'success') {
                    navigate('/services')
                } else {
                    navigate(-1)
                }
            }}
        />
    )
}

export default Payment
