import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    Minus,
    Plus,
    UsersRound,
} from 'lucide-react'

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

type DateParts = {
    day: string
    monthYear: string
    weekday: string
}

type DateFormatter = (value: string) => DateParts

type ServicesFooterProps = {
    checkIn: string
    checkOut: string
    setCheckIn: Dispatch<SetStateAction<string>>
    setCheckOut: Dispatch<SetStateAction<string>>
    roomGuests: RoomGuests[]
    setRoomGuests: Dispatch<SetStateAction<RoomGuests[]>>
    roomChoices: BookingRoomChoice[]
    notice: string
    dateParts: DateFormatter
    onDateChange: () => void
    onCheckAvailability: () => void
}

const dateValue = (date: Date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    return localDate.toISOString().slice(0, 10)
}

const startOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1)

const monthDays = (date: Date) => {
    const firstDay = startOfMonth(date)
    const offset = firstDay.getDay()
    const daysInMonth = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
    ).getDate()

    return [
        ...Array.from({ length: offset }, () => null),
        ...Array.from({ length: daysInMonth }, (_, index) =>
            new Date(date.getFullYear(), date.getMonth(), index + 1),
        ),
    ]
}

const monthLabel = (date: Date) =>
    new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)

const ServicesFooter = ({
    checkIn,
    checkOut,
    setCheckIn,
    setCheckOut,
    roomGuests,
    setRoomGuests,
    roomChoices,
    notice,
    dateParts,
    onDateChange,
    onCheckAvailability,
}: ServicesFooterProps) => {
    const [bookingPopover, setBookingPopover] = useState<BookingPopover>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const [calendarMonth, setCalendarMonth] = useState(() =>
        startOfMonth(new Date()),
    )

    const nights = useMemo(() => {
        if (!checkIn || !checkOut) return 0
        const difference =
            new Date(`${checkOut}T00:00:00`).getTime() -
            new Date(`${checkIn}T00:00:00`).getTime()
        return Math.max(0, Math.round(difference / 86_400_000))
    }, [checkIn, checkOut])

    const today = dateValue(new Date())
    const todayDate = new Date(`${today}T00:00:00`)
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

    const chooseDate = (date: Date) => {
        const value = dateValue(date)
        onDateChange()

        if (!checkIn || checkOut || value <= checkIn) {
            setCheckIn(value)
            setCheckOut('')
            return
        }

        setCheckOut(value)
        setBookingPopover(null)
    }

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

    const togglePopover = (popover: Exclude<BookingPopover, null>) => {
        setBookingPopover((current) =>
            current === popover ? null : popover,
        )
    }

    return (
        <footer
            aria-label="Stay dates and guests"
            className="fixed inset-x-0 bottom-0 z-40 w-full bg-white px-0 pb-0 shadow-[0_-8px_24px_rgba(15,23,42,0.10)]"
        >
            <div className="grid w-full grid-cols-2 items-center gap-2 bg-white px-4 py-2.5 sm:gap-4 sm:px-7 sm:py-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_268px] lg:gap-7">
                <div
                    className={`relative col-span-2 min-w-0 lg:col-span-1 ${
                        !isExpanded ? 'hidden lg:block' : ''
                    }`}
                >
                    <button
                        type="button"
                        aria-label="Choose check-in and check-out dates"
                        aria-haspopup="dialog"
                        aria-expanded={bookingPopover === 'dates'}
                        onClick={() => {
                            setCalendarMonth(
                                startOfMonth(
                                    checkIn
                                        ? new Date(`${checkIn}T00:00:00`)
                                        : new Date(),
                                ),
                            )
                            togglePopover('dates')
                        }}
                        className="grid w-full min-w-0 grid-cols-[36px_minmax(0,1fr)_1px_minmax(0,1fr)_1px_44px] items-center gap-2 bg-[#f1f1f3] px-2 py-2 text-left sm:grid-cols-[48px_minmax(0,1fr)_1px_minmax(0,1fr)_1px_62px] sm:gap-3 sm:px-4 sm:py-3"
                    >
                        <span className="flex size-9 items-center justify-center rounded-full bg-[#0875f9] text-white sm:size-11">
                            <CalendarDays
                                className="size-5 sm:size-6"
                                aria-hidden="true"
                            />
                        </span>
                        <span className="flex min-w-0 items-center gap-1">
                            <span className="text-xl font-bold leading-none text-slate-500 sm:text-2xl">
                                {dateParts(checkIn).day}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-[9px] leading-tight text-slate-600 sm:text-xs">
                                    Check-in
                                </span>
                                <span className="block truncate text-[8px] font-bold uppercase leading-tight text-slate-600 sm:text-[9px]">
                                    {dateParts(checkIn).monthYear}
                                </span>
                                <span className="block truncate text-[8px] leading-tight text-slate-500 sm:text-[9px]">
                                    {dateParts(checkIn).weekday || 'Choose a date'}
                                </span>
                            </span>
                        </span>
                        <span
                            className="h-7 w-px bg-slate-400/70"
                            aria-hidden="true"
                        />
                        <span className="flex min-w-0 items-center gap-1">
                            <span className="text-xl font-bold leading-none text-slate-500 sm:text-2xl">
                                {dateParts(checkOut).day}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-[9px] leading-tight text-slate-600 sm:text-xs">
                                    Check-out
                                </span>
                                <span className="block truncate text-[8px] font-bold uppercase leading-tight text-slate-600 sm:text-[9px]">
                                    {dateParts(checkOut).monthYear}
                                </span>
                                <span className="block truncate text-[8px] leading-tight text-slate-500 sm:text-[9px]">
                                    {dateParts(checkOut).weekday || 'Choose a date'}
                                </span>
                            </span>
                        </span>
                        <span
                            className="h-7 w-px bg-slate-400/70"
                            aria-hidden="true"
                        />
                        <span className="min-w-0 text-center">
                            <span className="block text-[9px] text-slate-600 sm:text-xs">
                                Nights
                            </span>
                            <span className="block text-sm font-bold text-slate-600 sm:text-base">
                                {nights}
                            </span>
                        </span>
                    </button>
                    {bookingPopover === 'dates' && (
                        <div
                            role="dialog"
                            aria-label="Choose your stay dates"
                            className="absolute bottom-full left-0 z-50 mb-3 w-[min(94vw,700px)] rounded-lg border border-slate-200 bg-white p-3 shadow-xl sm:p-4"
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-700 sm:text-sm">
                                    {checkIn && !checkOut
                                        ? 'Select check-out date'
                                        : 'Select check-in date'}
                                </p>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCalendarMonth((month) =>
                                                new Date(
                                                    month.getFullYear(),
                                                    month.getMonth() - 1,
                                                    1,
                                                ),
                                            )
                                        }
                                        disabled={
                                            calendarMonth <= startOfMonth(todayDate)
                                        }
                                        aria-label="Previous month"
                                        className="flex size-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 enabled:hover:bg-slate-100 disabled:opacity-40"
                                    >
                                        <ChevronLeft
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCalendarMonth((month) =>
                                                new Date(
                                                    month.getFullYear(),
                                                    month.getMonth() + 1,
                                                    1,
                                                ),
                                            )
                                        }
                                        aria-label="Next month"
                                        className="flex size-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                                    >
                                        <ChevronRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                                {[0, 1].map((monthOffset) => {
                                    const month = new Date(
                                        calendarMonth.getFullYear(),
                                        calendarMonth.getMonth() + monthOffset,
                                        1,
                                    )
                                    return (
                                        <div key={month.toISOString()}>
                                            <h3 className="mb-2 text-center text-[11px] font-semibold text-slate-700 sm:text-xs">
                                                {monthLabel(month)}
                                            </h3>
                                            <div className="grid grid-cols-7 gap-y-1 text-center">
                                                {[
                                                    'Su',
                                                    'Mo',
                                                    'Tu',
                                                    'We',
                                                    'Th',
                                                    'Fr',
                                                    'Sa',
                                                ].map((day) => (
                                                    <span
                                                        key={day}
                                                        className="py-1 text-[9px] font-medium text-slate-500"
                                                    >
                                                        {day}
                                                    </span>
                                                ))}
                                                {monthDays(month).map(
                                                    (day, index) => {
                                                        if (!day) {
                                                            return (
                                                                <span
                                                                    key={`empty-${index}`}
                                                                />
                                                            )
                                                        }
                                                        const value = dateValue(day)
                                                        const selected =
                                                            value === checkIn ||
                                                            value === checkOut
                                                        const inRange =
                                                            Boolean(
                                                                checkIn &&
                                                                    checkOut &&
                                                                    value > checkIn &&
                                                                    value < checkOut,
                                                            )
                                                        const disabled = value < today

                                                        return (
                                                            <button
                                                                key={value}
                                                                type="button"
                                                                disabled={disabled}
                                                                onClick={() =>
                                                                    chooseDate(day)
                                                                }
                                                                aria-label={new Intl.DateTimeFormat(
                                                                    'en',
                                                                    {
                                                                        dateStyle:
                                                                            'full',
                                                                    },
                                                                ).format(day)}
                                                                aria-pressed={selected}
                                                                className={`mx-auto flex size-7 items-center justify-center rounded-full text-[10px] transition sm:size-8 sm:text-[11px] ${
                                                                    selected
                                                                        ? 'bg-[#0875f9] font-semibold text-white'
                                                                        : inRange
                                                                          ? 'bg-blue-50 text-[#0875f9]'
                                                                          : 'text-slate-700 hover:bg-blue-50 hover:text-[#0875f9]'
                                                                } disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent`}
                                                            >
                                                                {day.getDate()}
                                                            </button>
                                                        )
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setBookingPopover(null)}
                                    className="rounded px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBookingPopover(null)}
                                    className="rounded bg-[#0875f9] px-4 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div
                    className={`relative min-w-0 ${
                        !isExpanded ? 'hidden lg:block' : ''
                    }`}
                >
                    <button
                        type="button"
                        aria-label="Choose rooms, adults, and children"
                        aria-haspopup="dialog"
                        aria-expanded={bookingPopover === 'guests'}
                        onClick={() => togglePopover('guests')}
                        className="flex w-full min-w-0 items-center gap-2 border-l border-slate-200 pl-2 text-left sm:gap-3 sm:pl-4"
                    >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0875f9] text-white sm:size-11">
                            <UsersRound
                                className="size-5 sm:size-6"
                                aria-hidden="true"
                            />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[10px] text-slate-600 sm:text-xs">
                                Persons
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="text-xl font-bold leading-none text-slate-500 sm:text-2xl">
                                    {adults}
                                </span>
                                <span className="block min-w-0 text-[8px] font-bold uppercase leading-tight text-slate-600 sm:text-[9px]">
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
                            role="dialog"
                            aria-label="Choose rooms and guests"
                            className="absolute bottom-full right-0 z-50 mb-3 w-[min(92vw,320px)] rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
                        >
                            <div className="max-h-[min(55vh,360px)] space-y-3 overflow-y-auto pr-1">
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
                                            className="border-b border-slate-100 pb-3 last:border-0"
                                        >
                                            <div className="mb-1 flex items-center justify-between">
                                                <h3 className="text-[11px] font-medium text-slate-600">
                                                    {room.stayId
                                                        ? `Guests for ${roomTitle ?? 'selected room'}`
                                                        : 'Choose a room or villa'}
                                                </h3>
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
                                                        className="text-[10px] font-medium text-slate-500 hover:text-red-600"
                                                    >
                                                        Remove room
                                                    </button>
                                                )}
                                            </div>
                                            <label className="mb-2 block">
                                                <span className="sr-only">
                                                    Preferred accommodation
                                                </span>
                                                <select
                                                    value={room.stayId ?? ''}
                                                    onChange={(event) =>
                                                        setRoomGuests(
                                                            (currentRooms) =>
                                                                currentRooms.map(
                                                                    (
                                                                        currentRoom,
                                                                        index,
                                                                    ) =>
                                                                        index ===
                                                                        roomIndex
                                                                            ? {
                                                                                  ...currentRoom,
                                                                                  stayId:
                                                                                      event
                                                                                          .target
                                                                                          .value ||
                                                                                      null,
                                                                              }
                                                                            : currentRoom,
                                                                ),
                                                        )
                                                    }
                                                    className="w-full rounded border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-700 outline-none focus:border-[#0875f9] focus:ring-1 focus:ring-[#0875f9]"
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

                                                        return (
                                                            <option
                                                                key={choice.id}
                                                                value={choice.id}
                                                                disabled={
                                                                    selectedElsewhere ||
                                                                    (choice.category ===
                                                                        'exclusive' &&
                                                                        otherRoomsAssigned) ||
                                                                    (choice.category ===
                                                                        'public' &&
                                                                        villaAssignedElsewhere)
                                                                }
                                                            >
                                                                {choice.title}
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
                                                    className="flex items-center justify-between py-1"
                                                >
                                                    <span className="text-xs font-semibold text-slate-700">
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
                                                            className="flex size-7 items-center justify-center rounded-full border border-[#0875f9] text-[#0875f9] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <Minus
                                                                className="size-3.5"
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
                                                            className="flex size-7 items-center justify-center rounded-full border border-[#0875f9] text-[#0875f9] hover:bg-blue-50"
                                                        >
                                                            <Plus
                                                                className="size-3.5"
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
                                    publicChoices.every((choice) =>
                                        roomGuests.some(
                                            (room) => room.stayId === choice.id,
                                        ),
                                    )
                                }
                                onClick={() =>
                                    setRoomGuests((currentRooms) => [
                                        ...currentRooms,
                                        { stayId: null, adults: 2, kids: 0 },
                                    ])
                                }
                                className="mt-2 text-[10px] font-semibold text-[#0875f9] hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                + Add room choice
                            </button>
                            <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setBookingPopover(null)}
                                    className="rounded px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBookingPopover(null)}
                                    className="rounded bg-[#0875f9] px-4 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="col-span-2 flex items-center justify-center gap-2 lg:col-span-1">
                    <button
                        type="button"
                        onClick={() => {
                            if (!isExpanded) {
                                setIsExpanded(true)
                                return
                            }

                            setBookingPopover(null)
                            onCheckAvailability()
                        }}
                        className="inline-flex min-h-11 w-[90%] items-center justify-center rounded-sm bg-[#2875e8] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1763d4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006dfc] focus-visible:ring-offset-2 sm:min-h-12 sm:text-base lg:min-h-[66px] lg:w-full lg:text-lg"
                    >
                        Check availability
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setIsExpanded((previous) => !previous)
                            setBookingPopover(null)
                        }}
                        aria-label={isExpanded ? 'Collapse booking form' : 'Expand booking form'}
                        aria-expanded={isExpanded}
                        className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-[#2875e8] text-white transition hover:bg-[#1763d4] lg:hidden"
                    >
                        {isExpanded ? (
                            <ChevronDown size={30} />
                        ) : (
                            <ChevronUp size={30} />
                        )}
                    </button>
                </div>
                {notice && (
                    <p
                        role="status"
                        className={`col-span-2 flex items-start gap-2 rounded-lg bg-blue-50 p-2.5 text-[10px] leading-4 text-blue-800 lg:col-span-3 ${
                            !isExpanded ? 'hidden lg:flex' : ''
                        }`}
                    >
                        <Check
                            className="mt-0.5 size-3.5 shrink-0"
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
