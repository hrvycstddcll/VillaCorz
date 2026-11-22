import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Minus, Plus, Trash2, X } from 'lucide-react'
import StayDateTimeFields from './StayDateTimeFields'
import ChoosingMascotPrompt from './ChoosingMascotPrompt'
import {
    formatPaidDays,
    formatStayDateTime,
    getStayWindow,
} from '../../../../lib/stayDateTime'
import type { StayDateFields } from '../../../../lib/stayDateTime'
import type { BookingRoomChoice, RoomGuests } from './ServicesFooter'

type BookingCalendarPanelProps = {
    fields: StayDateFields
    hasSelectedRooms: boolean
    onChange: (patch: Partial<StayDateFields>) => void
    roomGuests: RoomGuests[]
    setRoomGuests: Dispatch<SetStateAction<RoomGuests[]>>
    roomChoices: BookingRoomChoice[]
    notice: string
    noticeTone?: 'success' | 'error'
    unavailableRoomIds?: string[]
    unavailableDates?: string[]
    blockedReason?: string
    checkingAvailability?: boolean
    onUnavailableDate?: (date: string) => void
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onCheckAvailability: () => void
}

const summaryDate = (value: string) =>
    formatStayDateTime(value, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })

const BookingCalendarPanel = ({
    fields,
    hasSelectedRooms,
    onChange,
    roomGuests,
    setRoomGuests,
    roomChoices,
    notice,
    noticeTone = 'error',
    unavailableRoomIds = [],
    unavailableDates = [],
    blockedReason = '',
    checkingAvailability = false,
    onUnavailableDate,
    isOpen,
    onOpenChange,
    onCheckAvailability,
}: BookingCalendarPanelProps) => {
    const [isClosing, setIsClosing] = useState(false)
    const [selectedRoomIndex, setSelectedRoomIndex] = useState(0)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const drawerRef = useRef<HTMLElement>(null)
    const firstRoomSelectRef = useRef<HTMLSelectElement>(null)
    const closeTimerRef = useRef<number | null>(null)
    const scrollPositionRef = useRef(0)
    const stayWindow = getStayWindow(fields)
    const paidDays = stayWindow.paidDays
    const guestCount = roomGuests.reduce(
        (total, room) => total + room.adults + room.kids,
        0,
    )
    const selectedRoomCount = roomGuests.filter(
        (room) => room.stayId !== null,
    ).length
    const dateLabel = stayWindow.valid
        ? `${summaryDate(stayWindow.checkIn)} – ${summaryDate(stayWindow.checkOut)}`
        : fields.checkInDate
          ? `${summaryDate(stayWindow.checkIn)} – set paid days`
          : 'Select check-in'
    const bookingSummary = [
        dateLabel,
        stayWindow.valid ? formatPaidDays(paidDays) : null,
        `${guestCount} guest${guestCount === 1 ? '' : 's'}`,
        selectedRoomCount > 0
            ? `${selectedRoomCount} room${selectedRoomCount === 1 ? '' : 's'}`
            : null,
    ]
        .filter(Boolean)
        .join(' · ')
    const addedRoomTitles = roomGuests
        .map((room) => roomChoices.find((choice) => choice.id === room.stayId)?.title)
        .filter((title): title is string => Boolean(title))
    const roomSummaryText = [
        `${roomGuests.length} room${roomGuests.length === 1 ? '' : 's'}`,
        `${guestCount} guest${guestCount === 1 ? '' : 's'}`,
        addedRoomTitles.length
            ? `Added: ${addedRoomTitles.join(', ')}`
            : 'No rooms added yet',
    ].join(' · ')
    const stepLabel = hasSelectedRooms
        ? 'Step 2 of 2 · Pick dates'
        : 'Step 1 of 2 · Choose a room'

    const requestClose = useCallback(() => {
        if (isClosing) return

        setIsClosing(true)
        if (closeTimerRef.current !== null) {
            window.clearTimeout(closeTimerRef.current)
        }
        closeTimerRef.current = window.setTimeout(() => {
            setIsClosing(false)
            onOpenChange(false)
            closeTimerRef.current = null

            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(() => {
                    window.scrollTo?.({
                        top: scrollPositionRef.current,
                        behavior: 'smooth',
                    })
                    triggerRef.current?.focus()
                })
            }
        }, 260)
    }, [isClosing, onOpenChange])

    useEffect(() => {
        if (!isOpen || isClosing) return

        scrollPositionRef.current = window.scrollY
        const drawer = drawerRef.current
        if (drawer) drawer.scrollTop = 0
        drawer?.focus({ preventScroll: true })
    }, [isOpen, isClosing])

    useEffect(() => {
        if (!isOpen || isClosing) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            event.stopPropagation()
            requestClose()
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, isClosing, requestClose])

    useEffect(
        () => () => {
            if (closeTimerRef.current !== null) {
                window.clearTimeout(closeTimerRef.current)
            }
        },
        [],
    )

    const updateGuestCount = (
        index: number,
        key: 'adults' | 'kids',
        amount: number,
    ) => {
        setRoomGuests((current) =>
            current.map((room, roomIndex) =>
                roomIndex === index
                    ? {
                          ...room,
                          [key]: Math.max(
                              key === 'adults' ? 1 : 0,
                              room[key] + amount,
                          ),
                      }
                    : room,
            ),
        )
    }

    const removeRoom = (index: number) => {
        setRoomGuests((current) =>
            current.filter((_, roomIndex) => roomIndex !== index),
        )
        setSelectedRoomIndex((current) =>
            Math.max(
                0,
                current > index
                    ? current - 1
                    : Math.min(index, roomGuests.length - 2),
            ),
        )
    }

    const addRoom = () => {
        setSelectedRoomIndex(roomGuests.length)
        setRoomGuests((current) => [
            ...current,
            { stayId: null, adults: 2, kids: 0 },
        ])
    }

    return (
        <>
            <aside
                aria-label="Booking summary"
                aria-hidden={isOpen}
                inert={isOpen}
                className="h-fit w-full rounded-2xl border border-[#d7e6ff] bg-[#f5f9ff] p-4 font-poppins shadow-[0_10px_30px_rgba(8,117,249,0.08)] sm:p-5 md:p-3.5"
            >
                <div className="min-w-0">
                    <h2 className="font-jakarta text-xs font-semibold text-[#006dfc] sm:text-sm md:text-xs lg:text-base">
                        Your booking
                    </h2>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#006dfc] sm:text-xs md:text-[10px] lg:text-sm">
                        {stepLabel}
                    </p>
                    <p className="mt-1 break-words text-[13px] leading-relaxed sm:text-sm md:text-xs text-slate-600">
                        {bookingSummary}
                    </p>

                    {!isOpen && notice && (
                        <p
                            role="status"
                            className={`mt-3 text-[13px] leading-relaxed sm:text-sm md:text-xs ${
                                noticeTone === 'success'
                                    ? 'text-blue-700'
                                    : 'text-rose-600'
                            }`}
                        >
                            {notice}
                        </p>
                    )}

                    <button
                        ref={triggerRef}
                        type="button"
                        onClick={() => onOpenChange(true)}
                        aria-expanded={isOpen}
                        aria-controls="booking-drawer"
                        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#006dfc] px-4 py-3 text-[13px] font-semibold text-white sm:text-sm md:mt-4 md:min-h-10 md:px-3 md:py-2 md:text-xs shadow-[0_4px_12px_rgba(8,117,249,0.3)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] motion-reduce:transition-none"
                    >
                        Edit booking
                        <ChevronDown
                            className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${
                                isOpen ? 'rotate-180' : ''
                            }`}
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </aside>

            {!isOpen && !isClosing && <span id="booking-drawer" hidden />}

            {(isOpen || isClosing) &&
                createPortal(
                    <>
                        <div
                            aria-hidden="true"
                            onClick={requestClose}
                            className={`fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px] ${
                                isClosing
                                    ? 'booking-backdrop-exit'
                                    : 'booking-backdrop-enter'
                            }`}
                        />
                        <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center overflow-hidden px-3 pb-3 pt-[4.5rem] sm:px-4 sm:pt-20">
                        <section
                            id="booking-drawer"
                            ref={drawerRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="booking-drawer-title"
                            data-lenis-prevent=""
                            tabIndex={-1}
                            className={`pointer-events-auto flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#d7e6ff] bg-[#f5f9ff] font-poppins shadow-[0_28px_90px_-24px_rgba(15,23,42,0.45)] outline-none ${
                                isClosing
                                    ? 'booking-drawer-exit'
                                    : 'booking-drawer-enter'
                            }`}
                        >
                            <div className="z-10 flex shrink-0 items-start justify-between gap-3 border-b border-[#d7e6ff] bg-[#f5f9ff]/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4 md:px-5 md:py-3">
                                <div className="min-w-0">
                                    <h2
                                        id="booking-drawer-title"
                                        className="font-jakarta text-xs font-semibold text-[#006dfc] sm:text-sm md:text-xs lg:text-base"
                                    >
                                        Your booking
                                    </h2>
                                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#006dfc] sm:text-xs md:text-[10px] lg:text-sm">
                                        {stepLabel}
                                    </p>
                                    <p className="mt-1 truncate text-[13px] leading-relaxed sm:text-sm md:text-xs text-slate-600">
                                        {bookingSummary}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={requestClose}
                                    aria-label="Close booking form"
                                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-[#006dfc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] md:size-10"
                                >
                                    <X className="size-5" aria-hidden="true" />
                                </button>
                            </div>

                            <div
                                id="booking-panel-content"
                                data-lenis-prevent=""
                                className="booking-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
                            >
                                {notice && (
                                <p
                                    role="status"
                                    className={`mx-4 mt-4 rounded-lg px-3 py-2 text-[13px] leading-relaxed sm:text-sm md:mx-5 md:mt-3 md:text-xs ${
                                        noticeTone === 'success'
                                            ? 'bg-blue-50 text-blue-800'
                                            : 'text-rose-600'
                                    } sm:mx-6`}
                                >
                                    {notice}
                                </p>
                                )}

                                <div className="grid gap-5 px-4 py-4 sm:px-6 sm:py-5 md:gap-4 md:px-5 md:py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
                                <section
                                    aria-labelledby="booking-dates-heading"
                                    className="min-w-0"
                                >
                                    <h3
                                        id="booking-dates-heading"
                                        className="mb-3 font-jakarta text-xs font-semibold text-slate-900 sm:text-sm md:text-xs"
                                    >
                                        Dates &amp; paid days
                                    </h3>
                                    {hasSelectedRooms ? (
                                        <div className="booking-scrollbar lg:max-h-[min(54dvh,34rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
                                            <StayDateTimeFields
                                                fields={fields}
                                                onChange={onChange}
                                                compact
                                                scrollable={false}
                                                unavailableDates={unavailableDates}
                                                onUnavailableDate={onUnavailableDate}
                                            />
                                        </div>
                                    ) : (
                                        <ChoosingMascotPrompt
                                            compact
                                            actionLabel="Choose a room"
                                            onChooseRoom={() => {
                                                firstRoomSelectRef.current?.scrollIntoView?.(
                                                    { block: 'nearest' },
                                                )
                                                firstRoomSelectRef.current?.focus()
                                            }}
                                        />
                                    )}
                                </section>

                                <section
                                    aria-labelledby="booking-rooms-heading"
                                    className="min-w-0 lg:border-l lg:border-[#d7e6ff] lg:pl-6"
                                >
                                    <h3
                                        id="booking-rooms-heading"
                                        className="font-jakarta text-xs font-semibold text-slate-900 sm:text-sm md:text-xs"
                                    >
                                        Rooms &amp; guests
                                    </h3>
                                    <p className="mt-0.5 break-words text-xs text-slate-600 sm:text-sm md:text-xs">
                                        {roomSummaryText}
                                    </p>

                                    <div className="mt-3 space-y-3">
                                        {roomGuests.map((room, index) => {
                                            const villaAssignedElsewhere =
                                                roomGuests.some(
                                                    (otherRoom, otherIndex) =>
                                                        otherIndex !== index &&
                                                        roomChoices.some(
                                                            (choice) =>
                                                                choice.id ===
                                                                    otherRoom.stayId &&
                                                                choice.category ===
                                                                    'exclusive',
                                                        ),
                                                )
                                            const otherRoomsAssigned =
                                                roomGuests.some(
                                                    (otherRoom, otherIndex) =>
                                                        otherIndex !== index &&
                                                        otherRoom.stayId !== null &&
                                                        roomChoices.some(
                                                            (choice) =>
                                                                choice.id ===
                                                                    otherRoom.stayId &&
                                                                choice.category ===
                                                                    'public',
                                                        ),
                                                )

                                            const selectedTitle = roomChoices.find(
                                                (choice) => choice.id === room.stayId,
                                            )?.title
                                            const selectedUnavailable =
                                                room.stayId !== null &&
                                                unavailableRoomIds.includes(room.stayId)

                                            return (
                                                <section
                                                    key={index}
                                                    aria-label={`Room ${index + 1} guests`}
                                                    className={`rounded-lg border px-3 py-3 ${
                                                        room.stayId
                                                            ? 'border-[#006dfc]/40 bg-blue-50/60'
                                                            : 'border-slate-200 bg-white'
                                                    } ${
                                                        selectedRoomIndex === index
                                                            ? 'ring-1 ring-[#006dfc]/30'
                                                            : ''
                                                    }`}
                                                >
                                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                            <label
                                                                htmlFor={`booking-room-${index}`}
                                                                className="font-jakarta text-xs font-semibold text-slate-800 sm:text-sm md:text-xs"
                                                            >
                                                                Room {index + 1}
                                                            </label>
                                                            {selectedTitle ? (
                                                                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#006dfc]/10 px-2 py-0.5 text-xs font-medium text-[#006dfc] sm:text-sm md:text-xs">
                                                                    <Check
                                                                        className="size-3 shrink-0"
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span className="truncate">
                                                                        Added · {selectedTitle}
                                                                    </span>
                                                                </span>
                                                            ) : (
                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 sm:text-sm md:text-xs">
                                                                    Not added
                                                                </span>
                                                            )}
                                                            {selectedUnavailable ? (
                                                                <span className="rounded-full bg-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-700 sm:text-sm md:text-xs">
                                                                    Unavailable
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <div className="flex shrink-0 items-center gap-1">
                                                            {roomGuests.length > 1 && (
                                                                <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeRoom(index)
                                                                }
                                                                aria-label={`Remove room ${index + 1}`}
                                                                className="inline-flex size-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                                            >
                                                                <Trash2
                                                                    className="size-4"
                                                                    aria-hidden="true"
                                                                />
                                                            </button>
                                                        )}
                                                        </div>
                                                    </div>
                                                    <select
                                                        id={`booking-room-${index}`}
                                                        ref={index === 0 ? firstRoomSelectRef : undefined}
                                                        value={room.stayId ?? ''}
                                                        onFocus={() =>
                                                            setSelectedRoomIndex(index)
                                                        }
                                                        onChange={(event) => {
                                                            const stayId =
                                                                event.target.value || null
                                                            setSelectedRoomIndex(index)
                                                            if (!stayId) {
                                                                removeRoom(index)
                                                                return
                                                            }
                                                            setRoomGuests((current) =>
                                                                current.map((item, roomIndex) =>
                                                                    roomIndex === index
                                                                        ? { ...item, stayId }
                                                                        : item,
                                                                ),
                                                            )
                                                        }}
                                                        className={`booking-input mb-2 ${
                                                            room.stayId
                                                                ? 'border-[#006dfc] font-medium text-slate-900'
                                                                : 'text-slate-600'
                                                        }`}
                                                    >
                                                        <option value="">
                                                            Choose room or villa
                                                        </option>
                                                        {roomChoices.map((choice) => {
                                                            const selectedElsewhere =
                                                                roomGuests.some(
                                                                    (
                                                                        otherRoom,
                                                                        otherIndex,
                                                                    ) =>
                                                                        otherIndex !==
                                                                            index &&
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
                                                    {(['adults', 'kids'] as const).map(
                                                        (guestType) => (
                                                            <div
                                                                key={guestType}
                                                                className="flex min-h-11 items-center justify-between py-1 text-xs text-slate-600 sm:text-sm md:text-xs"
                                                            >
                                                                <span>
                                                                    {guestType === 'adults'
                                                                        ? 'Adults'
                                                                        : 'Kids'}
                                                                </span>
                                                                <span className="booking-stepper-shell">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            updateGuestCount(
                                                                                index,
                                                                                guestType,
                                                                                -1,
                                                                            )
                                                                        }
                                                                        aria-label={`Decrease ${guestType} for room ${index + 1}`}
                                                                        className="booking-stepper-button"
                                                                    >
                                                                        <Minus
                                                                            className="size-4"
                                                                            aria-hidden="true"
                                                                        />
                                                                    </button>
                                                                    <span className="booking-stepper-value">
                                                                        {room[guestType]}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            updateGuestCount(
                                                                                index,
                                                                                guestType,
                                                                                1,
                                                                            )
                                                                        }
                                                                        aria-label={`Increase ${guestType} for room ${index + 1}`}
                                                                        className="booking-stepper-button"
                                                                    >
                                                                        <Plus
                                                                            className="size-4"
                                                                            aria-hidden="true"
                                                                        />
                                                                    </button>
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </section>
                                            )
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addRoom}
                                        className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-[#006dfc] sm:text-sm md:text-xs hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                    >
                                        + Add room
                                    </button>
                                </section>
                                </div>
                            </div>

                            <div className="z-10 shrink-0 border-t border-[#d7e6ff] bg-[#f5f9ff]/95 px-4 pb-4 pt-3 backdrop-blur-sm sm:px-6 sm:pb-5">
                                {blockedReason && (
                                    <p
                                        role="alert"
                                        className="mb-2 text-[13px] leading-relaxed sm:text-sm md:text-xs text-rose-600"
                                    >
                                        {blockedReason}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={onCheckAvailability}
                                    disabled={
                                        checkingAvailability ||
                                        Boolean(blockedReason) ||
                                        !hasSelectedRooms
                                    }
                                    className="min-h-12 w-full rounded-lg bg-[#006dfc] px-4 py-3 text-[13px] font-semibold text-white sm:text-sm md:text-xs shadow-[0_4px_12px_rgba(0,109,252,0.3)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {checkingAvailability
                                        ? 'Checking availability'
                                        : !hasSelectedRooms
                                          ? 'Choose a room first'
                                          : blockedReason
                                            ? 'Unavailable'
                                            : 'Continue'}
                                </button>
                            </div>
                        </section>
                        </div>
                    </>,
                    document.body,
                )}
        </>
    )
}

export default BookingCalendarPanel
