import { useMemo } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Clock3, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { money } from '../../../lib/format'
import { formatPaidDays, formatStayDateTime } from '../../../lib/stayDateTime'

type PaymentViewStatus = 'pending' | 'success' | 'expired' | 'cancelled'

type PaymentSuccessViewProps = {
    status: PaymentViewStatus
    guestName: string
    email: string
    phoneNumber: string
    bookingId: string
    qrValue: string
    returnUrl?: string
    checkIn: string
    checkOut: string
    paidDays?: number
    nights?: number
    rooms: Array<{ name: string; adults: number; kids: number }>
    total: number
    error?: string
    onConfirm: () => void
    onRefresh: () => void
}

function formatReceiptDate(value: string) {
    return formatStayDateTime(value, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}

function PaymentSuccessView({
    status,
    guestName,
    email,
    phoneNumber,
    bookingId,
    qrValue,
    returnUrl,
    checkIn,
    checkOut,
    paidDays,
    nights,
    rooms,
    total,
    error,
    onConfirm,
    onRefresh,
}: PaymentSuccessViewProps) {
    const guestCount = rooms.reduce(
        (sum, room) => sum + room.adults + room.kids,
        0,
    )
    const confirmationUrl = useMemo(() => {
        const url = new URL(qrValue, window.location.origin)

        url.searchParams.set(
            'return_url',
            returnUrl ?? `${window.location.origin}/payment/${bookingId}`,
        )

        return url.toString()
    }, [bookingId, qrValue, returnUrl])
    const roomCount = rooms.length
    const stayLabel =
        paidDays != null
            ? formatPaidDays(paidDays)
            : `${nights ?? 1} night${(nights ?? 1) === 1 ? '' : 's'}`
    const isSuccessful = status === 'success'
    const isExpired = status === 'expired'
    const isCancelled = status === 'cancelled'

    const heading = isSuccessful
        ? 'Reservation confirmed'
        : isCancelled
          ? 'Reservation unavailable'
          : isExpired
            ? 'Payment QR expired'
            : 'Waiting for QR scan'

    const description = isSuccessful
        ? `Payment received. Your confirmation email was sent to ${email || 'your email'}.`
        : isCancelled
          ? 'Another guest confirmed these dates before you did. You were not charged. Go back and choose different dates.'
          : isExpired
            ? 'This payment link has expired. Go back and create a new booking to get a fresh QR code.'
            : 'Scan the QR code with your phone to confirm this reservation. Your dates are reserved after confirmation.'

    return (
        <main className="min-h-dvh bg-slate-50 px-4 py-6 font-poppins sm:px-6 sm:py-8">
            <div className="mx-auto w-full max-w-5xl">
                {error && (
                    <p
                        role="alert"
                        className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800"
                    >
                        {error}
                    </p>
                )}
                <nav aria-label="Booking progress" className="mb-5">
                    <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                        <li>Reservation</li>
                        <li aria-hidden="true">/</li>
                        <li aria-current="step" className="text-[#006dfc]">
                            Payment
                        </li>
                    </ol>
                </nav>

                <section
                    aria-labelledby="payment-success-title"
                    aria-live="polite"
                    aria-atomic="true"
                    className="flex items-start gap-4 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5"
                >
                    <div
                        aria-hidden="true"
                        className={`grid size-12 shrink-0 place-items-center rounded-full ${
                            isSuccessful
                                ? 'bg-emerald-100 text-emerald-700'
                                : isExpired || isCancelled
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                        }`}
                    >
                        {isSuccessful ? (
                            <Check className="size-6 stroke-[3]" />
                        ) : (
                            <Clock3 className="size-6" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Villa Corz · Booking update
                        </p>
                        <h1
                            id="payment-success-title"
                            className={`mt-1 text-xl font-semibold leading-tight sm:text-2xl ${
                                isSuccessful
                                    ? 'text-emerald-800'
                                    : isExpired || isCancelled
                                      ? 'text-rose-800'
                                      : 'text-slate-800'
                            }`}
                        >
                            {heading}
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {description}
                        </p>
                    </div>
                </section>

                <div
                    className={`mt-5 grid items-start gap-5 ${
                        status === 'pending'
                            ? 'md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'
                            : 'md:grid-cols-1'
                    }`}
                >
                    {status === 'pending' && (
                        <section
                            aria-labelledby="payment-qr-title"
                            className="flex min-w-0 flex-col items-center rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5"
                        >
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Demo payment
                            </p>
                            <h2
                                id="payment-qr-title"
                                className="mt-1 text-lg font-semibold text-slate-800"
                            >
                                Scan to confirm
                            </h2>
                            <p className="mt-1 text-center text-sm leading-5 text-slate-600">
                                Scan this code, then complete confirmation on your phone.
                            </p>
                            <div className="my-5 grid w-full place-items-center rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4">
                                <QRCodeSVG
                                    aria-label="Scannable Villa Corz demo payment confirmation QR code"
                                    className="size-52 max-w-full sm:size-56"
                                    value={confirmationUrl}
                                    size={224}
                                    level="Q"
                                    marginSize={4}
                                />
                            </div>
                            <a
                                href={confirmationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#006dfc] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0057c9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                            >
                                Open confirmation link
                                <ArrowUpRight className="size-4" aria-hidden="true" />
                            </a>

                            <button
                                type="button"
                                onClick={onRefresh}
                                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#006dfc]/40 hover:text-[#006dfc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                            >
                                <RefreshCw
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Check payment status
                            </button>

                            <p className="mt-4 w-full rounded-xl border border-[rgba(0,0,0,0.06)] bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                                Demo only: no real payment is processed. Complete confirmation on the linked page.
                            </p>
                        </section>
                    )}

                    <section
                        aria-labelledby="receipt-title"
                        className="min-w-0 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)] sm:p-5"
                    >
                        <h2
                            id="receipt-title"
                            className="text-lg font-semibold text-slate-800"
                        >
                            Reservation details
                        </h2>
                        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                            <ReceiptField label="Guest name" value={guestName || 'Guest'} />
                            <ReceiptField label="Email" value={email || 'Not provided'} />
                            <ReceiptField
                                label="Phone number"
                                value={phoneNumber || 'Not provided'}
                            />
                            <ReceiptField
                                label="Check-in"
                                value={formatReceiptDate(checkIn)}
                            />
                            <ReceiptField
                                label="Check-out"
                                value={formatReceiptDate(checkOut)}
                            />
                            <ReceiptField
                                label="Accommodation"
                                value={
                                    rooms.map((room) => room.name).join(', ') ||
                                    'No room selected'
                                }
                            />
                            <ReceiptField
                                label="Stay"
                                value={`${stayLabel} · ${roomCount} room${roomCount === 1 ? '' : 's'} · ${guestCount} guest${guestCount === 1 ? '' : 's'}`}
                            />
                        </dl>
                        <p className="mt-5 border-t border-slate-100 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Booking reference
                            <strong className="mt-1 block break-words font-medium text-slate-700 [overflow-wrap:anywhere]">
                                {bookingId}
                            </strong>
                        </p>
                        <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                            <span className="text-sm font-medium text-slate-600">
                                Total amount
                            </span>
                            <strong className="text-xl font-semibold tabular-nums text-[#006dfc]">
                                {money(total)}
                            </strong>
                        </div>
                    </section>
                </div>

                <button
                    type="button"
                    onClick={onConfirm}
                    className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] sm:w-auto ${
                        isSuccessful
                            ? 'bg-[#006dfc] text-white shadow-[0_4px_12px_rgba(0,109,252,0.25)] hover:bg-[#0057c9]'
                            : 'border border-[rgba(0,0,0,0.08)] bg-white text-slate-700 hover:border-[#006dfc]/40 hover:text-[#006dfc]'
                    }`}
                >
                    {!isSuccessful && <ArrowLeft aria-hidden="true" className="size-4" />}
                    {isSuccessful ? 'Return to services' : 'Back to booking'}
                </button>
            </div>
        </main>
    )
}

function ReceiptField({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {label}
            </dt>
            <dd className="mt-1 break-words text-sm font-medium leading-5 text-slate-800 [overflow-wrap:anywhere]">
                {value}
            </dd>
        </div>
    )
}

export default PaymentSuccessView
