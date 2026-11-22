import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatPaidDays, formatStayDateTime } from '../../../../lib/stayDateTime'
import type { Stay } from '../../services/shared'

export type HomeAvailabilityPanelProps = {
    checkIn: string
    paidDays: number
    choices: Stay[]
    availabilityByServiceId: Record<number, boolean>
    selectedRoomIds: string[]
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
    checkingAvailability,
    availabilityError,
    roomsLoading,
    roomsError,
    onToggleRoom,
}: HomeAvailabilityPanelProps) => {
    const [open, setOpen] = useState(true)
    const availableCount = choices.filter(
        (choice) => availabilityByServiceId[Number(choice.id)] === true,
    ).length
    const dateLabel = checkIn
        ? formatStayDateTime(checkIn, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
          })
        : 'Choose your dates'

    return (
        <section aria-label="Available rooms" className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#006dfc]">
                        Available rooms
                    </p>
                    <p className="truncate text-xs text-slate-500">
                        {dateLabel} · {formatPaidDays(paidDays)} ·{' '}
                        {availableCount} available
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
                <div className="mt-2 max-h-[min(36svh,240px)] overflow-y-auto">
                    {roomsError ? (
                        <p role="alert" className="text-xs text-rose-700">
                            {roomsError}
                        </p>
                    ) : roomsLoading ? (
                        <p role="status" className="text-xs text-slate-500">
                            Loading rooms...
                        </p>
                    ) : checkingAvailability ? (
                        <p role="status" className="text-xs text-slate-500">
                            Checking live availability...
                        </p>
                    ) : availabilityError ? (
                        <p role="alert" className="text-xs text-rose-700">
                            {availabilityError}
                        </p>
                    ) : choices.length === 0 ? (
                        <p className="text-xs text-slate-500">
                            No rooms are available right now.
                        </p>
                    ) : (
                        <ul className="grid gap-1.5 sm:grid-cols-2">
                            {choices.map((choice) => {
                                const selected = selectedRoomIds.includes(choice.id)
                                const available =
                                    availabilityByServiceId[Number(choice.id)]
                                const status = selected
                                    ? 'Added'
                                    : available === true
                                      ? 'Available'
                                      : available === false
                                        ? 'Unavailable'
                                        : 'Checking'
                                const disabled = !selected && available !== true

                                return (
                                    <li
                                        key={choice.id}
                                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-slate-900">
                                                {choice.title}
                                            </p>
                                            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                                                <span
                                                    aria-hidden="true"
                                                    className={`size-1.5 rounded-full ${
                                                        selected || available === true
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
                                            aria-label={`${selected ? 'Remove' : 'Add'} ${choice.title}`}
                                            className={`inline-flex min-h-9 shrink-0 items-center justify-center rounded-md px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] ${
                                                selected
                                                    ? 'bg-blue-50 text-[#006dfc] hover:bg-blue-100'
                                                    : available === true
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
