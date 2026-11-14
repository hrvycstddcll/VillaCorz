import { useEffect } from 'react'
import { Bed, Users, X } from 'lucide-react'
import { money } from '../../../lib/format'
import type { BookingRoom } from '../../../services/types'

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

type BookingRoomsModalProps = {
    rooms: BookingRoom[]
    onClose: () => void
}

const BookingRoomsModal = ({ rooms, onClose }: BookingRoomsModalProps) => {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [onClose])

    const totalGuests = rooms.reduce(
        (sum, room) => sum + room.adults + room.kids,
        0,
    )

    return (
        <div
            className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="booking-rooms-title"
                className="flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
            >
                <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2
                            id="booking-rooms-title"
                            className="text-lg font-bold tracking-tight text-slate-900"
                        >
                            Reserved rooms
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {rooms.length} room{rooms.length === 1 ? '' : 's'} ·{' '}
                            {totalGuests} guest{totalGuests === 1 ? '' : 's'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close dialog"
                        className={`grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 ${focusRing}`}
                    >
                        <X className="size-4" aria-hidden="true" />
                    </button>
                </header>

                <div className="overflow-y-auto p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {rooms.map((room, index) => (
                            <article
                                key={`${room.name}-${index}`}
                                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                            >
                                <div className="relative h-36 w-full bg-slate-100">
                                    {room.image_url ? (
                                        <img
                                            src={room.image_url}
                                            alt={room.name}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-50 to-slate-100 text-[#0875f9]">
                                            <Bed
                                                className="size-10"
                                                aria-hidden="true"
                                            />
                                        </div>
                                    )}
                                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 backdrop-blur">
                                        {room.kind === 'exclusive'
                                            ? 'Exclusive'
                                            : 'Room'}
                                    </span>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        {room.name}
                                    </h3>
                                    {room.description && (
                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                            {room.description}
                                        </p>
                                    )}
                                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                                        <span className="inline-flex items-center gap-1">
                                            <Users
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                            {room.adults} adult
                                            {room.adults === 1 ? '' : 's'}
                                            {room.kids > 0
                                                ? `, ${room.kids} kid${room.kids === 1 ? '' : 's'}`
                                                : ''}
                                        </span>
                                        <span className="font-semibold text-slate-800">
                                            {money(Number(room.line_total))}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}

export default BookingRoomsModal