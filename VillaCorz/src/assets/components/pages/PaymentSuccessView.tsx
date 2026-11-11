import { Check } from 'lucide-react'
import { money } from '../../../lib/format'

type PaymentSuccessViewProps = {
    firstName: string
    lastName: string
    phoneNumber: string
    checkIn: string
    checkOut: string
    nights: number
    rooms: Array<{ name: string; adults: number; kids: number }>
    total: number
    onConfirm: () => void
}

const qrSize = 25

function isFinderCell(row: number, column: number, startRow: number, startColumn: number) {
    const localRow = row - startRow
    const localColumn = column - startColumn
    if (localRow < 0 || localRow > 6 || localColumn < 0 || localColumn > 6) {
        return null
    }

    return (
        localRow === 0 ||
        localRow === 6 ||
        localColumn === 0 ||
        localColumn === 6 ||
        (localRow >= 2 && localRow <= 4 && localColumn >= 2 && localColumn <= 4)
    )
}

function isQrCellDark(row: number, column: number) {
    const finders = [
        isFinderCell(row, column, 0, 0),
        isFinderCell(row, column, 0, qrSize - 7),
        isFinderCell(row, column, qrSize - 7, 0),
    ]
    const finderCell = finders.find((cell) => cell !== null)
    if (finderCell !== undefined) return finderCell

    const value = (row * 17 + column * 31 + row * column * 7) % 13
    return value < 6 || (row % 4 === 0 && column % 3 === 1)
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

function QrCodeMockup() {
    return (
        <svg
            aria-label="Decorative booking QR code mockup"
            className="size-36 sm:size-40"
            role="img"
            viewBox={`0 0 ${qrSize} ${qrSize}`}
        >
            <rect width={qrSize} height={qrSize} fill="white" />
            {Array.from({ length: qrSize }, (_, row) =>
                Array.from({ length: qrSize }, (_, column) =>
                    isQrCellDark(row, column) ? (
                        <rect
                            key={`${row}-${column}`}
                            x={column}
                            y={row}
                            width="1"
                            height="1"
                            fill="#101010"
                        />
                    ) : null,
                ),
            )}
        </svg>
    )
}

function PaymentSuccessView({
    firstName,
    lastName,
    phoneNumber,
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

    return (
        <main className="fixed inset-0 z-[80] overflow-y-auto bg-[#f7f6fa] px-3 py-5 font-poppins sm:px-5 sm:py-8">
            <div className="mx-auto w-full max-w-[410px] border-t-2 border-[#b994ff] bg-white px-3 pb-5 pt-4 shadow-[0_8px_28px_rgba(70,50,100,0.12)] sm:px-5">
                <section
                    aria-labelledby="payment-success-title"
                    className="relative flex min-h-40 flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white px-4 py-4 shadow-[0_3px_12px_rgba(15,23,42,0.18)]"
                >
                    <div aria-hidden="true" className="absolute inset-x-7 top-2 flex justify-between text-lg">
                        <span className="text-amber-400">·</span>
                        <span className="translate-y-2 text-purple-400">·</span>
                        <span className="-translate-y-1 text-sky-400">·</span>
                        <span className="translate-y-3 text-amber-400">·</span>
                        <span className="-translate-y-2 text-emerald-400">·</span>
                        <span className="translate-y-2 text-sky-400">·</span>
                    </div>
                    <div className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-emerald-300 to-emerald-600 shadow-[0_4px_12px_rgba(16,185,129,0.35)] ring-4 ring-emerald-100">
                        <div className="grid size-12 place-items-center rounded-full border border-white/60">
                            <Check aria-hidden="true" className="size-8 stroke-[3.5] text-white" />
                        </div>
                    </div>
                    <h1
                        id="payment-success-title"
                        className="mt-2 text-center text-sm font-bold text-emerald-500"
                    >
                        Payment Successful
                    </h1>
                    <p className="mt-0.5 text-center text-[9px] text-slate-500">
                        You have successfully paid
                    </p>
                </section>

                <section
                    aria-label="Villa Corz booking QR code"
                    className="mt-3 flex flex-col items-center rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-[0_3px_12px_rgba(15,23,42,0.18)]"
                >
                    <p className="text-[9px] font-semibold text-slate-600">VillaCorz</p>
                    <QrCodeMockup />
                </section>

                <section
                    aria-label="Payment receipt details"
                    className="mt-3 rounded-lg border border-slate-100 bg-white px-3 py-3 shadow-[0_3px_12px_rgba(15,23,42,0.18)]"
                >
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[9px] leading-tight">
                        <ReceiptField label="Name" value={guestName || 'Guest'} />
                        <ReceiptField label="Phone Number" value={phoneNumber || 'Not provided'} />
                        <ReceiptField label="Checkin" value={formatReceiptDate(checkIn)} />
                        <ReceiptField label="Checkout" value={formatReceiptDate(checkOut)} />
                        <ReceiptField label="Services" value={rooms.map((room) => room.name).join(', ') || 'No room selected'} />
                        <ReceiptField
                            label="You Selected"
                            value={`${nights} night${nights === 1 ? '' : 's'}, ${roomCount} room${roomCount === 1 ? '' : 's'} · ${guestCount} guest${guestCount === 1 ? '' : 's'}`}
                        />
                    </div>
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
                    Confirm Payment
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
