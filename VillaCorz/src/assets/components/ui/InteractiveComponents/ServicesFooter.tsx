import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react'
import {
    CalendarDays,
    Check,
    ChevronUp,
    ChevronDown,
    Minus,
    Plus,
    UsersRound,
    X,
} from 'lucide-react'
import StayDateTimeFields from './StayDateTimeFields'
import ChoosingMascotPrompt from './ChoosingMascotPrompt'
import { formatStayDateTime, type StayDateFields } from '../../../../lib/stayDateTime'

export type RoomGuests = {
    stayId: string | null
    adults: number
    kids: number
}

export type BookingRoomChoice = {
    id: string
    title: string
    category: 'public' | 'exclusive'
}

type BookingPopover = 'dates' | 'guests' | null

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ')

type ServicesFooterProps = {
    fields: StayDateFields
    hasSelectedRooms: boolean
    datesEnabled?: boolean
    onChange: (patch: Partial<StayDateFields>) => void
    checkIn: string
    checkOut: string
    paidDays: number
    roomGuests: RoomGuests[]
    setRoomGuests: Dispatch<SetStateAction<RoomGuests[]>>
    roomChoices: BookingRoomChoice[]
    notice: string
    unavailableRoomIds?: string[]
    unavailableDates?: string[]
    blockedReason?: string
    checkingAvailability?: boolean
    onUnavailableDate?: (date: string) => void
    onCheckAvailability: () => void
    onBrowseRooms: () => void
    availabilityResults?: ReactNode
}

const ServicesFooter = ({
    fields,
    hasSelectedRooms,
    datesEnabled = hasSelectedRooms,
    onChange,
    checkIn,
    checkOut,
    paidDays,
    roomGuests,
    setRoomGuests,
    roomChoices,
    notice,
    unavailableRoomIds = [],
    unavailableDates = [],
    blockedReason = '',
    checkingAvailability = false,
    onUnavailableDate,
    onCheckAvailability,
    onBrowseRooms,
    availabilityResults,
}: ServicesFooterProps) => {
    const [bookingPopover, setBookingPopover] = useState<BookingPopover>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const footerRef = useRef<HTMLElement | null>(null)
    const dateTriggerRef = useRef<HTMLButtonElement | null>(null)
    const guestTriggerRef = useRef<HTMLButtonElement | null>(null)
    const popoverRef = useRef<HTMLDivElement | null>(null)
    const lastTriggerRef = useRef<HTMLButtonElement | null>(null)

    const adults = roomGuests.reduce((total, room) => total + room.adults, 0)
    const children = roomGuests.reduce((total, room) => total + room.kids, 0)
    const assignedRooms = roomGuests.filter((room) => room.stayId !== null).length
    const publicChoices = roomChoices.filter(
        (choice) => choice.category === 'public',
    )
    const hasExclusiveRoom = roomGuests.some((room) =>
        roomChoices.some(
            (choice) => choice.id === room.stayId && choice.category === 'exclusive',
        ),
    )

    const updateRoomGuests = (
        roomIndex: number,
        guestType: 'adults' | 'kids',
        amount: number,
    ) => {
        setRoomGuests((currentRooms) =>
            currentRooms.map((room, index) =>
                index === roomIndex
                    ? {
                          ...room,
                          [guestType]: Math.max(
                              guestType === 'adults' ? 1 : 0,
                              room[guestType] + amount,
                          ),
                      }
                    : room,
            ),
        )
    }

    const closePopover = useCallback((restoreFocus = true) => {
        setBookingPopover(null)
        if (restoreFocus) {
            lastTriggerRef.current?.focus({ preventScroll: true })
        }
        lastTriggerRef.current = null
    }, [])

    const togglePopover = (popover: Exclude<BookingPopover, null>) => {
        if (bookingPopover === popover) {
            closePopover()
            return
        }

        lastTriggerRef.current =
            popover === 'dates' ? dateTriggerRef.current : guestTriggerRef.current
        setBookingPopover(popover)
    }

    useEffect(() => {
        const footer = footerRef.current
        const root = document.documentElement
        if (!footer) return

        const updateScrollPadding = () => {
            const height = Math.round(footer.getBoundingClientRect().height)
            root.style.setProperty('--services-footer-height', `${height}px`)
        }

        updateScrollPadding()
        const observer =
            typeof ResizeObserver !== 'undefined'
                ? new ResizeObserver(updateScrollPadding)
                : null
        observer?.observe(footer)
        window.addEventListener('resize', updateScrollPadding)

        return () => {
            observer?.disconnect()
            window.removeEventListener('resize', updateScrollPadding)
            root.style.removeProperty('--services-footer-height')
        }
    }, [])

    useEffect(() => {
        if (!bookingPopover) return

        const popover = popoverRef.current
        if (!popover) return

        const getFocusableItems = () =>
            Array.from(popover.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))

        popover.focus({ preventScroll: true })
        popover.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation()
                closePopover()
                return
            }

            if (event.key !== 'Tab') return

            const items = getFocusableItems()
            if (items.length === 0) return

            const first = items[0]
            const last = items[items.length - 1]

            if (!popover.contains(document.activeElement)) {
                event.preventDefault()
                first.focus()
                return
            }

            if (
                event.shiftKey &&
                (document.activeElement === popover ||
                    document.activeElement === first)
            ) {
                event.preventDefault()
                last.focus()
                return
            }

            if (!event.shiftKey && document.activeElement === popover) {
                event.preventDefault()
                first.focus()
                return
            }

            if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (footerRef.current?.contains(event.target as Node)) return
            closePopover(false)
        }

        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('pointerdown', handlePointerDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('pointerdown', handlePointerDown)
        }
    }, [bookingPopover, closePopover])

    return (
        <footer
            ref={footerRef}
            aria-label="Stay dates and guests"
            className="fixed inset-x-0 bottom-0 z-40 w-full bg-white px-0 pb-0 font-poppins shadow-[0_-6px_20px_rgba(15,23,42,0.10)]"
        >
            {availabilityResults && (
                <div className="border-b border-slate-100 bg-white px-2.5 pt-1.5 sm:px-4 sm:pt-2">
                    {availabilityResults}
                </div>
            )}
            <div className="grid w-full grid-cols-2 items-center gap-1 bg-white px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(160px,0.8fr)] md:gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(190px,0.8fr)] lg:gap-4">
                <div
                    className={`relative col-span-2 min-w-0 md:col-span-1 ${
                        !isExpanded ? 'hidden md:block' : ''
                    }`}
                >
                    <button
                        ref={dateTriggerRef}
                        type="button"
                        aria-label={
                            datesEnabled
                                ? 'Choose check-in date, time, and paid days'
                                : 'Choose a room first'
                        }
                        aria-haspopup="dialog"
                        aria-expanded={bookingPopover === 'dates'}
                        onClick={() => togglePopover('dates')}
                        className="grid min-h-10 w-full min-w-0 grid-cols-[28px_minmax(0,1fr)_1px_minmax(0,1fr)_1px_36px] items-center gap-1 bg-[#f1f1f3] px-2 py-1 text-left sm:grid-cols-[34px_minmax(0,1fr)_1px_minmax(0,1fr)_1px_44px] sm:gap-1.5 sm:px-2.5 sm:py-1.5 md:min-h-10"
                    >
                        <span className="flex size-7 items-center justify-center rounded-full bg-[#006dfc] text-white sm:size-9 md:size-8">
                            <CalendarDays
                                className="size-3.5 sm:size-4"
                                aria-hidden="true"
                            />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[10px] leading-snug text-slate-600 sm:text-xs md:text-[11px]">
                                Check-in
                            </span>
                            <span className="block truncate font-jakarta text-xs font-semibold leading-snug text-slate-700 sm:text-sm">
                                {formatStayDateTime(checkIn, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                            </span>
                        </span>
                        <span
                            className="h-5 w-px bg-slate-400/70"
                            aria-hidden="true"
                        />
                        <span className="min-w-0">
                            <span className="block text-[10px] leading-snug text-slate-600 sm:text-xs md:text-[11px]">
                                Check-out
                            </span>
                            <span className="block truncate font-jakarta text-xs font-semibold leading-snug text-slate-700 sm:text-sm">
                                {formatStayDateTime(checkOut, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                            </span>
                        </span>
                        <span
                            className="h-5 w-px bg-slate-400/70"
                            aria-hidden="true"
                        />
                        <span className="min-w-0 text-center">
                            <span className="block text-[10px] text-slate-600 sm:text-xs md:text-[11px]">
                                Paid days
                            </span>
                            <span className="block font-jakarta text-xs font-bold text-slate-600 sm:text-sm">
                                {paidDays}
                            </span>
                        </span>
                    </button>
                    {bookingPopover === 'dates' && (
                        <div
                            ref={popoverRef}
                            tabIndex={-1}
                            data-lenis-prevent=""
                            role="dialog"
                            aria-label={
                                datesEnabled
                                    ? 'Choose your stay date and time'
                                    : 'Choose a room first'
                            }
                            className="booking-scrollbar absolute bottom-full left-1/2 z-50 mb-2 max-h-[min(42svh,360px)] w-[min(92vw,380px)] -translate-x-1/2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2.5 shadow-xl sm:p-3 md:left-0 md:max-h-[min(38svh,320px)] md:w-[min(54vw,360px)] md:translate-x-0"
                        >
                            {datesEnabled ? (
                                <>
                                    <StayDateTimeFields
                                        fields={fields}
                                        onChange={onChange}
                                        compact
                                        scrollable={false}
                                        unavailableDates={unavailableDates}
                                        onUnavailableDate={onUnavailableDate}
                                    />
                                    <div className="mt-1.5 flex justify-end border-t border-slate-100 pt-1.5">
                                        <button
                                            type="button"
                                            onClick={() => closePopover()}
                                            className="inline-flex min-h-9 items-center justify-center rounded bg-[#006dfc] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#005bd4] sm:text-sm"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <ChoosingMascotPrompt
                                    compact
                                    actionLabel="Browse rooms"
                                    onChooseRoom={onBrowseRooms}
                                />
                            )}
                        </div>
                    )}
                </div>

                <div
                    className={`relative col-span-2 min-w-0 md:col-span-1 ${
                        !isExpanded ? 'hidden md:block' : ''
                    }`}
                >
                    <button
                        ref={guestTriggerRef}
                        type="button"
                        aria-label="Choose rooms, adults, and children"
                        aria-haspopup="dialog"
                        aria-expanded={bookingPopover === 'guests'}
                        onClick={() => togglePopover('guests')}
                        className="flex min-h-10 w-full min-w-0 items-center gap-1 border-l border-slate-200 pl-1.5 text-left sm:gap-2 sm:pl-2.5 md:min-h-10"
                    >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#006dfc] text-white sm:size-9 md:size-8">
                            <UsersRound
                                className="size-3.5 sm:size-4"
                                aria-hidden="true"
                            />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[10px] text-slate-600 sm:text-xs md:text-[11px]">
                                Persons
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="font-jakarta text-sm font-bold leading-none text-slate-500 sm:text-base md:text-sm">
                                    {adults}
                                </span>
                                <span className="block min-w-0 text-[10px] font-bold uppercase leading-4 text-slate-600 sm:text-[11px]">
                                    Adults · +{children} kids
                                    <span className="block font-normal normal-case">
                                        Rooms: {assignedRooms} selected
                                    </span>
                                </span>
                            </span>
                        </span>
                    </button>
                    {bookingPopover === 'guests' && (
                        <div
                            ref={popoverRef}
                            tabIndex={-1}
                            data-lenis-prevent=""
                            role="dialog"
                            aria-label="Choose rooms and guests"
                            className="booking-scrollbar absolute bottom-full left-1/2 z-50 mb-2 max-h-[min(42svh,360px)] w-[min(90vw,360px)] -translate-x-1/2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2.5 shadow-xl md:left-auto md:right-0 md:max-h-[min(38svh,320px)] md:w-[min(48vw,340px)] md:translate-x-0"
                        >
                            <div className="space-y-1.5">
                                {roomGuests.map((room, roomIndex) => {
                                    const roomTitle = roomChoices.find(
                                        (choice) => choice.id === room.stayId,
                                    )?.title
                                    const villaAssignedElsewhere =
                                        roomGuests.some(
                                            (otherRoom, index) =>
                                                index !== roomIndex &&
                                                roomChoices.some(
                                                    (choice) =>
                                                        choice.id === otherRoom.stayId &&
                                                        choice.category === 'exclusive',
                                                ),
                                        )
                                    const otherRoomsAssigned =
                                        roomGuests.some(
                                            (otherRoom, index) =>
                                                index !== roomIndex &&
                                                otherRoom.stayId !== null &&
                                                roomChoices.some(
                                                    (choice) =>
                                                        choice.id === otherRoom.stayId &&
                                                        choice.category === 'public',
                                                ),
                                        )

                                    return (
                                        <section
                                            key={roomIndex}
                                            aria-label={
                                                room.stayId
                                                    ? `Guests for ${roomTitle ?? 'selected room'}`
                                                    : 'Choose a room or villa for these guests'
                                            }
                                            className={`rounded-lg border px-2 py-1 ${
                                                room.stayId
                                                    ? 'border-[#006dfc]/40 bg-blue-50/60'
                                                    : 'border-slate-200 bg-white'
                                            }`}
                                        >
                                            <div className="mb-0.5 flex flex-wrap items-center justify-between gap-1.5">
                                                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                                    <h3 className="font-jakarta text-xs font-semibold text-slate-700 sm:text-sm">
                                                        Room {roomIndex + 1}
                                                    </h3>
                                                    {room.stayId ? (
                                                        <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#006dfc]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#006dfc] sm:text-xs md:text-[11px]">
                                                            <Check
                                                                className="size-3 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                            <span className="truncate">
                                                                Added · {roomTitle ?? 'selected room'}
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:text-xs md:text-[11px]">
                                                            Not added
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    {room.stayId && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setRoomGuests(
                                                                    (currentRooms) =>
                                                                        currentRooms.filter(
                                                                            (_, index) =>
                                                                                index !==
                                                                                roomIndex,
                                                                        ),
                                                                )
                                                            }
                                                            aria-label={`Deselect room ${roomIndex + 1}`}
                                                            className="inline-flex min-h-8 items-center gap-1 rounded-md px-1 text-[10px] font-semibold text-[#006dfc] sm:text-xs md:text-[11px] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                                        >
                                                            <X
                                                                className="size-3"
                                                                aria-hidden="true"
                                                            />
                                                            Clear
                                                        </button>
                                                    )}
                                                    {roomGuests.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setRoomGuests(
                                                                    (currentRooms) =>
                                                                        currentRooms.filter(
                                                                            (_, index) =>
                                                                                index !==
                                                                                roomIndex,
                                                                        ),
                                                                )
                                                            }
                                                            aria-label={`Remove room ${roomIndex + 1}`}
                                                            className="inline-flex min-h-8 items-center rounded-md px-1 text-[10px] font-medium text-slate-500 sm:text-xs md:text-[11px] hover:bg-white hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                                        >
                                                            Remove room
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <label className="mb-2 block">
                                                <span className="sr-only">
                                                    Preferred accommodation
                                                </span>
                                                <select
                                                    value={room.stayId ?? ''}
                                                    onChange={(event) => {
                                                        const stayId =
                                                            event.target.value || null
                                                        setRoomGuests((currentRooms) => {
                                                            if (!stayId) {
                                                                return currentRooms.filter(
                                                                    (_, index) =>
                                                                        index !==
                                                                        roomIndex,
                                                                )
                                                            }
                                                            return currentRooms.map(
                                                                (currentRoom, index) =>
                                                                    index === roomIndex
                                                                        ? {
                                                                              ...currentRoom,
                                                                              stayId,
                                                                          }
                                                                        : currentRoom,
                                                            )
                                                        })
                                                    }}
                                                    className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-[#006dfc] focus:ring-1 focus:ring-[#006dfc] sm:text-sm"
                                                >
                                                    <option value="">
                                                        Choose room or villa
                                                    </option>
                                                    {roomChoices.map((choice) => {
                                                        const selectedElsewhere =
                                                            roomGuests.some(
                                                                (
                                                                    otherRoom,
                                                                    index,
                                                                ) =>
                                                                    index !==
                                                                        roomIndex &&
                                                                    otherRoom.stayId ===
                                                                        choice.id,
                                                            )
                                                        const unavailable =
                                                            unavailableRoomIds.includes(
                                                                choice.id,
                                                            )

                                                        return (
                                                            <option
                                                                key={choice.id}
                                                                value={choice.id}
                                                                disabled={
                                                                    selectedElsewhere ||
                                                                    (unavailable &&
                                                                        room.stayId !==
                                                                            choice.id) ||
                                                                    (choice.category ===
                                                                        'exclusive' &&
                                                                        otherRoomsAssigned) ||
                                                                    (choice.category ===
                                                                        'public' &&
                                                                        villaAssignedElsewhere)
                                                                }
                                                            >
                                                                {choice.title}
                                                                {unavailable
                                                                    ? ' (unavailable)'
                                                                    : ''}
                                                            </option>
                                                        )
                                                    })}
                                                </select>
                                            </label>
                                            {(
                                                [
                                                    {
                                                        label: 'Adults',
                                                        key: 'adults' as const,
                                                    },
                                                    {
                                                        label: 'Kids',
                                                        key: 'kids' as const,
                                                    },
                                                ] as const
                                            ).map(({ label, key }) => (
                                                <div
                                                    key={key}
                                                    className="flex items-center justify-between py-0.5"
                                                >
                                                    <span className="text-xs font-semibold text-slate-700 sm:text-sm">
                                                        {room[key]} {label}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateRoomGuests(
                                                                    roomIndex,
                                                                    key,
                                                                    -1,
                                                                )
                                                            }
                                                            disabled={
                                                                key === 'adults'
                                                                    ? room.adults <=
                                                                      1
                                                                    : room.kids <=
                                                                      0
                                                            }
                                                            aria-label={`Remove one ${label.toLowerCase()} from guest group ${roomIndex + 1}`}
                                                            className="flex size-9 items-center justify-center rounded-full border border-[#006dfc] text-[#006dfc] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 sm:size-10"
                                                        >
                                                            <Minus
                                                                className="size-3"
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateRoomGuests(
                                                                    roomIndex,
                                                                    key,
                                                                    1,
                                                                )
                                                            }
                                                            aria-label={`Add one ${label.toLowerCase()} to guest group ${roomIndex + 1}`}
                                                            className="flex size-9 items-center justify-center rounded-full border border-[#006dfc] text-[#006dfc] hover:bg-blue-50 sm:size-10"
                                                        >
                                                            <Plus
                                                                className="size-3"
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </section>
                                    )
                                })}
                            </div>
                            <button
                                type="button"
                                disabled={
                                    hasExclusiveRoom ||
                                    (roomGuests.length > 0 &&
                                        publicChoices.every((choice) =>
                                            roomGuests.some(
                                                (room) => room.stayId === choice.id,
                                            ),
                                        ))
                                }
                                onClick={() =>
                                    setRoomGuests((currentRooms) => [
                                        ...currentRooms,
                                        { stayId: null, adults: 2, kids: 0 },
                                    ])
                                }
                                className="mt-1.5 inline-flex min-h-9 items-center text-xs font-semibold text-[#006dfc] hover:text-[#005bd4] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                            >
                                + Add room choice
                            </button>
                            <div className="mt-1.5 flex justify-end gap-1.5 border-t border-slate-100 pt-1.5">
                                <button
                                    type="button"
                                    onClick={() => closePopover()}
                                    className="inline-flex min-h-9 items-center justify-center rounded px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 sm:text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => closePopover()}
                                    className="inline-flex min-h-9 items-center justify-center rounded bg-[#006dfc] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#005bd4] sm:text-sm"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="col-span-2 flex items-center justify-center gap-2 md:col-span-1">
                    <button
                        type="button"
                        onClick={() => {
                            if (!isExpanded) {
                                setIsExpanded(true)
                                return
                            }

                            closePopover(false)
                            onCheckAvailability()
                        }}
                        className="inline-flex min-h-10 w-full items-center justify-center rounded-sm bg-[#006dfc] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#005bd4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006dfc] focus-visible:ring-offset-2 sm:text-sm md:min-h-10 md:text-xs"
                    >
                        {checkingAvailability
                            ? 'Checking availability'
                            : 'Check availability'}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setIsExpanded((previous) => !previous)
                            closePopover(false)
                        }}
                        aria-label={isExpanded ? 'Collapse booking form' : 'Expand booking form'}
                        aria-expanded={isExpanded}
                        className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-[#006dfc] text-white transition hover:bg-[#005bd4] md:hidden"
                    >
                        {isExpanded ? (
                            <ChevronDown size={20} />
                        ) : (
                            <ChevronUp size={20} />
                        )}
                    </button>
                </div>
                {blockedReason && (
                    <p
                        role="alert"
                        className={`col-span-2 rounded-lg bg-rose-50 p-1.5 text-[11px] leading-snug text-rose-700 sm:text-xs md:text-[11px] md:col-span-3 ${
                            !isExpanded ? 'hidden md:flex' : ''
                        }`}
                    >
                        {blockedReason}
                    </p>
                )}
                {notice && (
                    <p
                        role="status"
                        className={`col-span-2 flex items-start gap-1.5 rounded-lg bg-blue-50 p-1.5 text-[11px] leading-snug text-blue-800 sm:text-xs md:text-[11px] md:col-span-3 ${
                            !isExpanded ? 'hidden md:flex' : ''
                        }`}
                    >
                        <Check
                            className="mt-0.5 size-3 shrink-0"
                            aria-hidden="true"
                        />
                        {notice}
                    </p>
                )}
            </div>
        </footer>
    )
}

export default ServicesFooter
