import { Check, Clock3 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { money } from '../../../lib/format'

type PaymentSuccessViewProps = {
    status: 'pending' | 'success'
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    bookingId: string
    qrValue: string
    checkIn: string
    checkOut: string
    nights: number
    rooms: Array<{ name: string; adults: number; kids: number }>
    total: number
    onConfirm: () => void
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
    firstName,
    lastName,
    email,
    phoneNumber,
    bookingId,
    qrValue,
    checkIn,
    checkOut,
    nights,
    rooms,
    total,
    onConfirm,
}: PaymentSuccessViewProps) {
    const guestName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    const guestCount = rooms.reduce((sum, room) => sum + room.adults + room.kids, 0)
    const roomCount = rooms.length
    const isSuccessful = status === 'success'

    return (
        <main className="fixed inset-0 z-[80] overflow-y-auto bg-[#f7f6fa] px-3 py-5 font-poppins sm:px-5 sm:py-8">
            <div className="mx-auto w-full max-w-[410px] border-t-2 border-[#b994ff] bg-white px-3 pb-5 pt-4 shadow-[0_8px_28px_rgba(70,50,100,0.12)] sm:px-5">
                <section
                    aria-labelledby="payment-success-title"
                    className="relative flex min-h-40 flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white px-4 py-4 shadow-[0_3px_12px_rgba(15,23,42,0.18)]"
                >
                    <div
                        className={`grid size-14 place-items-center rounded-full ${isSuccessful ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                    >
                        {isSuccessful ? (
                            <Check aria-hidden="true" className="size-8 stroke-[3]" />
                        ) : (
                            <Clock3 aria-hidden="true" className="size-7" />
                        )}
                    </div>
                    <h1
                        id="payment-success-title"
                        className={`mt-2 text-center text-sm font-bold ${isSuccessful ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                    >
                        {isSuccessful ? 'Demo payment successful' : 'Waiting for QR scan'}
                    </h1>
                    <p className="mt-1 text-center text-[10px] leading-4 text-slate-600">
                        {isSuccessful
                            ? 'The QR was opened and this demo booking was marked successful.'
                            : 'Scan the QR code below to mark this demo booking successful.'}
                    </p>
                </section>

                {!isSuccessful && (
                    <section
                        aria-label="Demo payment QR code"
                        className="mt-3 flex flex-col items-center rounded-lg border border-slate-100 bg-white px-3 py-3 shadow-[0_3px_12px_rgba(15,23,42,0.18)]"
                    >
                        <p className="text-xs font-semibold text-slate-700">Scan to confirm this booking</p>
                        <QRCodeSVG
                            aria-label="Scannable Villa Corz demo payment confirmation QR code"
                            className="my-3 size-40"
                            value={qrValue}
                            size={176}
                            level="M"
                            marginSize={4}
                        />
                        <a
                            href={qrValue}
                            target="_blank"
                            rel="noreferrer"
                            className="min-h-10 inline-flex items-center text-xs font-semibold text-[#0875f9] underline underline-offset-2"
                        >
                            Test the scan confirmation
                        </a>
                        <p className="mt-2 max-w-xs text-center text-[10px] leading-4 text-amber-800">
                            Demo only: this does not process a real payment. The success state is local to the browser that opens the QR.
                        </p>
                    </section>
                )}

                <section
                    aria-label="Payment receipt details"
                    className="mt-3 rounded-lg border border-slate-100 bg-white px-3 py-3 shadow-[0_3px_12px_rgba(15,23,42,0.18)]"
                >
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[9px] leading-tight">
                        <ReceiptField label="Name" value={guestName || 'Guest'} />
                        <ReceiptField label="Email" value={email || 'Not provided'} />
                        <ReceiptField label="Phone Number" value={phoneNumber || 'Not provided'} />
                        <ReceiptField label="Checkin" value={formatReceiptDate(checkIn)} />
                        <ReceiptField label="Checkout" value={formatReceiptDate(checkOut)} />
                        <ReceiptField label="Services" value={rooms.map((room) => room.name).join(', ') || 'No room selected'} />
                        <ReceiptField
                            label="You Selected"
                            value={`${nights} night${nights === 1 ? '' : 's'}, ${roomCount} room${roomCount === 1 ? '' : 's'} · ${guestCount} guest${guestCount === 1 ? '' : 's'}`}
                        />
                    </div>
                    <p className="mt-2 text-[8px] text-slate-500">
                        Demo booking reference: {bookingId}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="text-[9px] text-slate-600">Total amount sent</span>
                        <strong className="text-lg font-bold text-[#3d6dff]">{money(total)}</strong>
                    </div>
                </section>

                <button
                    type="button"
                    onClick={onConfirm}
                    className="mt-4 min-h-10 w-full rounded-full bg-[#0875f9] px-4 text-[10px] font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                    {isSuccessful ? 'Return to services' : 'Back to booking'}
                </button>
            </div>
        </main>
    )
}

function ReceiptField({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <span className="block text-[8px] text-slate-500">{label}</span>
            <strong className="block break-words font-semibold text-slate-800">{value}</strong>
        </div>
    )
}

export default PaymentSuccessView
