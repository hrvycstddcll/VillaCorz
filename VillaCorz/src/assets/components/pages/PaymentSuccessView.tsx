import { ArrowLeft, Check, Clock3, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { money } from '../../../lib/format'

type PaymentViewStatus = 'pending' | 'success' | 'expired' | 'cancelled'

type PaymentSuccessViewProps = {
    status: PaymentViewStatus
    guestName: string
    email: string
    phoneNumber: string
    bookingId: string
    qrValue: string
    checkIn: string
    checkOut: string
    nights: number
    rooms: Array<{ name: string; adults: number; kids: number }>
    total: number
    error?: string
    onConfirm: () => void
    onRefresh: () => void
}

function formatReceiptDate(value: string) {
    if (!value) return 'Not selected'

    const date = new Date(`${value}T00:00:00`)
    if (!Number.isFinite(date.getTime())) return 'Not selected'

    return new Intl.DateTimeFormat('en', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date)
}

function PaymentSuccessView({
    status,
    guestName,
    email,
    phoneNumber,
    bookingId,
    qrValue,
    checkIn,
    checkOut,
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
    const roomCount = rooms.length
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
        <main className="min-h-dvh bg-[#f7f6fa] px-4 py-6 font-poppins sm:px-6 sm:py-8">
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
                        <li aria-current="step" className="text-slate-800">
                            Payment
                        </li>
                    </ol>
                </nav>

                <section
                    aria-labelledby="payment-success-title"
                    aria-live="polite"
                    aria-atomic="true"
                    className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.08)] sm:p-5"
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
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                            className="flex min-w-0 flex-col items-center rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.08)] sm:p-5"
                        >
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Demo payment
                            </p>
                            <h2
                                id="payment-qr-title"
                                className="mt-1 text-lg font-semibold text-slate-800"
                            >
                                Scan to confirm
                            </h2>
                            <p className="mt-1 text-center text-sm leading-5 text-slate-600">
                                Open your phone camera and scan this code.
                            </p>
                            <QRCodeSVG
                                aria-label="Scannable Villa Corz demo payment confirmation QR code"
                                className="my-5 size-52 max-w-full sm:size-56"
                                value={qrValue}
                                size={224}
                                level="Q"
                                marginSize={4}
                            />
                            <a
                                href={qrValue}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-semibold text-[#0875f9] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                            >
                                Open confirmation link
                            </a>

                            <button
                                type="button"
                                onClick={onRefresh}
                                className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#0875f9]/40 hover:text-[#0875f9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                            >
                                <RefreshCw
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Check payment status
                            </button>

                            <p className="mt-4 w-full rounded-lg bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-900">
                                Demo only: no real payment is processed. Complete
                                the confirmation on your phone to reserve these
                                dates.
                            </p>
                        </section>
                    )}

                    <section
                        aria-labelledby="receipt-title"
                        className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.08)] sm:p-5"
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
                                value={`${nights} night${nights === 1 ? '' : 's'} · ${roomCount} room${roomCount === 1 ? '' : 's'} · ${guestCount} guest${guestCount === 1 ? '' : 's'}`}
                            />
                        </dl>
                        <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
                            Booking reference
                            <strong className="mt-1 block break-words font-medium text-slate-700 [overflow-wrap:anywhere]">
                                {bookingId}
                            </strong>
                        </p>
                        <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                            <span className="text-sm font-medium text-slate-600">
                                Total amount
                            </span>
                            <strong className="text-xl font-semibold tabular-nums text-[#0875f9]">
                                {money(total)}
                            </strong>
                        </div>
                    </section>
                </div>

                <button
                    type="button"
                    onClick={onConfirm}
                    className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] sm:w-auto ${
                        isSuccessful
                            ? 'bg-[#0875f9] text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] hover:bg-blue-700 focus-visible:outline-blue-700'
                            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
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
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium leading-5 text-slate-800 [overflow-wrap:anywhere]">
                {value}
            </dd>
        </div>
    )
}

export default PaymentSuccessView
