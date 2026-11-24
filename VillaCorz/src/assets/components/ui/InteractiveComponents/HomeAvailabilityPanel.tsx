import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatPaidDays, formatStayDateTime } from '../../../../lib/stayDateTime'
import {
    stayCategoryConflicts,
    stayCategoryConflictMessage,
    type Stay,
} from '../../services/shared'

export type HomeAvailabilityPanelProps = {
    checkIn: string
    paidDays: number
    choices: Stay[]
    availabilityByServiceId: Record<number, boolean>
    selectedRoomIds: string[]
    selectedStays: Stay[]
    checkingAvailability: boolean
    availabilityError: string
    roomsLoading: boolean
    roomsError: string
    onToggleRoom: (stay: Stay) => void
}

const HomeAvailabilityPanel = ({
    checkIn,
    paidDays,
    choices,
    availabilityByServiceId,
    selectedRoomIds,
    selectedStays,
    checkingAvailability,
    availabilityError,
    roomsLoading,
    roomsError,
    onToggleRoom,
}: HomeAvailabilityPanelProps) => {
    const [open, setOpen] = useState(true)
    const isSelected = (choice: Stay) => selectedRoomIds.includes(choice.id)
    const availableCount = choices.filter(
        (choice) => availabilityByServiceId[Number(choice.id)] === true,
    ).length
    const visibleChoices = choices.filter(
        (choice) =>
            availabilityByServiceId[Number(choice.id)] === true ||
            isSelected(choice),
    )
    const summaryLabel = roomsLoading
        ? 'Loading rooms...'
        : checkingAvailability
          ? 'Checking availability...'
          : availabilityError
            ? 'Availability unavailable'
            : `${availableCount} available`
    const dateLabel = checkIn
        ? formatStayDateTime(checkIn, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
          })
        : 'Choose your dates'

    return (
        <section aria-label="Available rooms" className="pb-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#006dfc]">
                        Available rooms
                    </p>
                    <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                        {dateLabel} · {formatPaidDays(paidDays)} ·{' '}
                        {summaryLabel}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setOpen((current) => !current)}
                    aria-expanded={open}
                    className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[#006dfc] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                >
                    {open ? 'Hide rooms' : 'Show rooms'}
                    {open ? (
                        <ChevronDown className="size-3.5" aria-hidden="true" />
                    ) : (
                        <ChevronUp className="size-3.5" aria-hidden="true" />
                    )}
                </button>
            </div>
            {open && (
                <div
                    data-lenis-prevent=""
                    className="booking-scrollbar mt-1.5 max-h-[min(24svh,160px)] overflow-y-auto"
                >
                    {roomsError ? (
                        <p role="alert" className="text-[11px] text-rose-700 sm:text-xs">
                            {roomsError}
                        </p>
                    ) : roomsLoading ? (
                        <p role="status" className="text-[11px] text-slate-500 sm:text-xs">
                            Loading rooms...
                        </p>
                    ) : checkingAvailability ? (
                        <p role="status" className="text-[11px] text-slate-500 sm:text-xs">
                            Checking live availability...
                        </p>
                    ) : availabilityError ? (
                        <p role="alert" className="text-[11px] text-rose-700 sm:text-xs">
                            {availabilityError}
                        </p>
                    ) : visibleChoices.length === 0 ? (
                        <p role="status" className="text-[11px] text-slate-500 sm:text-xs">
                            No room available for this date
                        </p>
                    ) : (
                        <ul className="grid gap-1.5 sm:grid-cols-2">
                            {visibleChoices.map((choice) => {
                                const selected = isSelected(choice)
                                const conflict = stayCategoryConflicts(
                                    choice,
                                    selectedStays,
                                )
                                const available =
                                    availabilityByServiceId[Number(choice.id)]
                                const status = selected
                                    ? 'Added'
                                    : conflict
                                      ? choice.category === 'exclusive'
                                        ? 'Villa conflict'
                                        : 'Room conflict'
                                      : available === true
                                        ? 'Available'
                                        : available === false
                                          ? 'Unavailable'
                                          : 'Checking'
                                const disabled =
                                    !selected && (available !== true || conflict)

                                return (
                                    <li
                                        key={choice.id}
                                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-slate-900">
                                                {choice.title}
                                            </p>
                                            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500 sm:text-[11px]">
                                                <span
                                                    aria-hidden="true"
                                                    className={`size-1.5 rounded-full ${
                                                        selected ||
                                                        (!conflict && available === true)
                                                            ? 'bg-[#006dfc]'
                                                            : available === false
                                                              ? 'bg-slate-300'
                                                              : 'bg-amber-400'
                                                    }`}
                                                />
                                                {choice.category === 'exclusive'
                                                    ? 'Whole villa'
                                                    : 'Private room'}
                                                {' · '}
                                                {status}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onToggleRoom(choice)}
                                            disabled={disabled}
                                            aria-label={`${selected ? 'Remove' : 'Add'} ${choice.title}${conflict ? `. ${stayCategoryConflictMessage(choice)}` : ''}`}
                                            className={`inline-flex min-h-9 shrink-0 items-center justify-center rounded-md px-2.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] ${
                                                selected
                                                    ? 'bg-blue-50 text-[#006dfc] hover:bg-blue-100'
                                                    : !conflict && available === true
                                                      ? 'bg-[#006dfc] text-white hover:bg-[#005bd4]'
                                                      : 'cursor-not-allowed bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            {selected ? 'Remove' : 'Add'}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            )}
        </section>
    )
}

export default HomeAvailabilityPanel
