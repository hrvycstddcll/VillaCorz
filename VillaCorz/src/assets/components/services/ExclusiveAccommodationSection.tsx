import { Check, X } from 'lucide-react'
import ServiceTile from '../ui/InteractiveComponents/ServiceTile'
import { stayCategoryConflictMessage, type Stay } from './shared'

export function ExclusiveAccommodationSection({
    stay,
    loading = false,
    selectedStay,
    selectedRoomIds,
    unavailable = false,
    reservationBlocked = false,
    activePhoto,
    onSelectStay,
    onToggleReservation,
    onSelectPhoto,
}: {
    stay: Stay | null
    loading?: boolean
    selectedStay: Stay | null
    selectedRoomIds: string[]
    unavailable?: boolean
    reservationBlocked?: boolean
    activePhoto: string
    onSelectStay: (stay: Stay) => void
    onToggleReservation: (stay: Stay) => void
    onSelectPhoto: (image: string) => void
}) {
    const showSkeleton = loading && !stay
    const isReservationSelected = Boolean(stay && selectedRoomIds.includes(stay.id))
    const selectedRoomNumber = stay
        ? selectedRoomIds.indexOf(stay.id) + 1 || undefined
        : undefined

    if (showSkeleton) {
        return (
            <section
                aria-labelledby="exclusive-title"
                className="mb-8 sm:mb-11 md:mb-7"
                aria-busy="true"
            >
                <div className="mb-3">
                    <h2
                        id="exclusive-title"
                        className="text-base font-bold text-[#171717] sm:text-lg md:text-base"
                    >
                        Whole villa
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 sm:text-sm md:text-xs">
                        Choose the whole villa in the booking panel to reserve it for your group.
                    </p>
                </div>
                <div role="status" aria-label="Loading whole villa">
                    <span className="sr-only">Loading whole villa.</span>
                    <div aria-hidden="true">
                        <div className="relative overflow-hidden rounded-xl shadow-md ring-1 ring-slate-100">
                            <div className="relative h-48 w-full overflow-hidden bg-slate-100 sm:h-64 md:h-56 lg:h-72">
                                <div className="absolute inset-0 animate-pulse bg-slate-200/70 motion-reduce:animate-none" />
                                <div className="absolute inset-x-0 bottom-0 flex h-[42%] items-end justify-between gap-2 bg-gradient-to-t from-slate-900/15 via-slate-900/5 to-transparent px-2 pb-1 pt-1 sm:px-2.5">
                                    <div className="absolute left-0 top-0 h-14 w-[34%] min-w-40 animate-pulse bg-white/80 motion-reduce:animate-none sm:h-16 sm:min-w-48" />
                                    <div className="flex min-w-0 flex-col items-start gap-1.5 pt-9 sm:pt-11">
                                        <div className="h-4 w-28 animate-pulse rounded bg-white/70 motion-reduce:animate-none sm:w-32" />
                                        <div className="h-3 w-36 animate-pulse rounded bg-white/60 motion-reduce:animate-none sm:w-44" />
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                                        <div className="h-12 w-20 animate-pulse rounded-md bg-white/45 motion-reduce:animate-none sm:w-24" />
                                        <div className="h-8 w-24 animate-pulse rounded-md bg-white/85 motion-reduce:animate-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 pb-2">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-14 w-20 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none sm:h-16 sm:w-24 md:h-14 md:w-20"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        )
    }

    if (!stay) return null

    return (
        <section aria-labelledby="exclusive-title" className="mb-8 sm:mb-11 md:mb-7">
            <div className="mb-3">
                <h2 id="exclusive-title" className="text-base font-bold text-[#171717] sm:text-lg md:text-base">
                    Whole villa
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm md:text-xs">
                    Choose the whole villa in the booking panel to reserve it for your group.
                </p>
            </div>
            <ServiceTile
                variant="exclusive"
                stay={stay}
                isSelected={selectedStay?.id === stay.id}
                activePhoto={activePhoto}
                gallery={stay.gallery}
                unavailable={unavailable}
                onSelect={() => onSelectStay(stay)}
                onSelectPhoto={onSelectPhoto}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d7e6ff] bg-[#f5f9ff] px-3 py-2 md:px-2.5 md:py-1.5">
                <span
                    className={`inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold ${
                        isReservationSelected
                            ? 'text-[#006dfc]'
                            : unavailable || reservationBlocked
                              ? 'text-slate-400'
                              : 'text-slate-500'
                    }`}
                >
                    {isReservationSelected ? (
                        <>
                            <Check className="size-4" aria-hidden="true" />
                            Added{selectedRoomNumber ? ` · Room ${selectedRoomNumber}` : ''}
                        </>
                    ) : unavailable ? (
                        'Unavailable for these dates'
                    ) : reservationBlocked ? (
                        'Remove private rooms first'
                    ) : (
                        'Not added to your booking'
                    )}
                </span>
                <button
                    type="button"
                    onClick={() => onToggleReservation(stay)}
                    disabled={
                        (unavailable || reservationBlocked) &&
                        !isReservationSelected
                    }
                    title={
                        reservationBlocked && !isReservationSelected
                            ? stayCategoryConflictMessage(stay)
                            : undefined
                    }
                    aria-label={
                        isReservationSelected
                            ? `Remove ${stay.title} from your booking`
                            : unavailable
                              ? `${stay.title} is unavailable for these dates`
                              : reservationBlocked
                                ? `${stay.title} cannot be added. ${stayCategoryConflictMessage(stay)}`
                                : `Add ${stay.title} to your booking`
                    }
                    className={`inline-flex min-h-11 items-center gap-1 rounded-md px-4 py-2 text-xs font-semibold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:opacity-60 ${
                        isReservationSelected
                            ? 'bg-[#006dfc] text-white hover:bg-blue-700'
                            : 'bg-white text-[#006dfc] hover:bg-[#006dfc] hover:text-white'
                    }`}
                >
                    {isReservationSelected ? (
                        <>
                            <X className="size-4" aria-hidden="true" />
                            Remove
                        </>
                    ) : unavailable ? (
                        'Unavailable'
                    ) : reservationBlocked ? (
                        'Blocked'
                    ) : (
                        'Add whole villa'
                    )}
                </button>
            </div>
        </section>
    )
}
