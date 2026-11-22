import { useState } from 'react'
import ServiceTile from '../ui/InteractiveComponents/ServiceTile'
import type { Stay } from './shared'

export function PublicAccommodationSection({
    rooms,
    loading,
    error,
    onRetry,
    selectedStay,
    selectedRoomIds,
    unavailableRoomIds = [],
    onSelectStay,
    onReserve,
}: {
    rooms: Stay[]
    loading: boolean
    error: string
    onRetry: () => void
    selectedStay: Stay | null
    selectedRoomIds: string[]
    unavailableRoomIds?: string[]
    onSelectStay: (stay: Stay) => void
    onReserve: (stay: Stay) => void
}) {
    const [showAllRooms, setShowAllRooms] = useState(false)
    const visibleRooms = showAllRooms ? rooms : rooms.slice(0, 4)
    const roomGridClass = 'grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:gap-3 xl:grid-cols-3'

    return (
        <section
            aria-labelledby="public-title"
            className="mb-8 sm:mb-11 md:mb-7"
            aria-busy={loading}
        >
            <div className="mb-3 flex items-end justify-between gap-4 md:mb-2 md:gap-3">
                <div>
                    <h2 id="public-title" className="text-base font-bold text-[#171717] sm:text-lg md:text-base">
                        Private rooms
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 sm:text-sm md:text-xs">
                        Add a room to your booking, then choose its guest count in the booking panel.
                    </p>
                </div>
                <span className="hidden text-xs text-slate-500 sm:block">
                    {loading ? 'Loading rooms.' : `${rooms.length} rooms`}
                </span>
            </div>

            {loading ? (
                <div
                    className={roomGridClass}
                    role="status"
                    aria-label="Loading private rooms"
                >
                    <span className="sr-only">Loading rooms.</span>
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            aria-hidden="true"
                            className="relative min-w-0 overflow-hidden rounded-xl bg-white text-left shadow-md ring-1 ring-slate-100"
                        >
                            <div className="relative aspect-[5/4] w-full overflow-hidden bg-slate-100">
                                <div className="absolute inset-0 animate-pulse bg-slate-200/70 motion-reduce:animate-none" />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[35%] bg-gradient-to-t from-slate-900/10 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 grid gap-2 p-3 sm:p-3.5">
                                    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-3">
                                        <div className="min-w-0 space-y-2">
                                            <div className="h-11 w-32 animate-pulse rounded-md bg-white/80 motion-reduce:animate-none sm:w-36" />
                                            <div className="h-4 w-3/4 max-w-[14rem] animate-pulse rounded bg-white/75 motion-reduce:animate-none" />
                                            <div className="h-3 w-2/5 animate-pulse rounded bg-white/65 motion-reduce:animate-none" />
                                        </div>
                                        <div className="flex flex-row items-end gap-2 sm:flex-col sm:items-end">
                                            <div className="h-12 w-20 animate-pulse rounded-md bg-white/45 motion-reduce:animate-none sm:w-24" />
                                            <div className="h-11 w-24 animate-pulse rounded-md bg-white/90 motion-reduce:animate-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div role="alert" className="rounded-xl border border-dashed border-rose-200 bg-rose-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-rose-700">{error}</p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="mt-3 rounded-full bg-[#006dfc] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                    >
                        Try again
                    </button>
                </div>
            ) : rooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-600">
                        No rooms are available right now. Please check back soon.
                    </p>
                </div>
            ) : (
                <div className={roomGridClass}>
                    {visibleRooms.map((stay) => (
                        <ServiceTile
                            key={stay.id}
                            variant="room"
                            stay={stay}
                            isSelected={selectedStay?.id === stay.id}
                            isReservationSelected={selectedRoomIds.includes(
                                stay.id,
                            )}
                            selectedRoomNumber={
                                selectedRoomIds.indexOf(stay.id) + 1 || undefined
                            }
                            unavailable={unavailableRoomIds.includes(stay.id)}
                            onSelect={() => onSelectStay(stay)}
                            onToggleReservation={() => onReserve(stay)}
                        />
                    ))}
                </div>
            )}

            {!loading && !error && rooms.length > 4 && !showAllRooms && (
                <div className="mt-1 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setShowAllRooms(true)}
                        className="min-h-11 rounded-full bg-white px-5 py-2 text-sm text-slate-600 shadow-[0_4px_18px_rgba(15,23,42,0.12)] transition hover:text-[#006dfc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] md:min-h-10 md:px-4 md:py-1.5 md:text-xs"
                    >
                        Show more
                    </button>
                </div>
            )}
        </section>
    )
}
