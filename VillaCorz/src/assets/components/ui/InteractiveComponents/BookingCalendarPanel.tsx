import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react'
import { createPortal } from 'react-dom'
import {
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Minus,
    Plus,
    Trash2,
    X,
} from 'lucide-react'
import type { BookingRoomChoice, RoomGuests } from './ServicesFooter'

type BookingCalendarPanelProps = {
    checkIn: string
    checkOut: string
    setCheckIn: Dispatch<SetStateAction<string>>
    setCheckOut: Dispatch<SetStateAction<string>>
    roomGuests: RoomGuests[]
    setRoomGuests: Dispatch<SetStateAction<RoomGuests[]>>
    selectedRoomIndex: number
    onSelectedRoomIndexChange: (index: number) => void
    roomChoices: BookingRoomChoice[]
    notice: string
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onDateChange: () => void
    onCheckAvailability: () => void
}

const dateValue = (date: Date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    return localDate.toISOString().slice(0, 10)
}

const dateSummary = (value: string) => {
    const date = new Date(`${value}T00:00:00`)
    const day = new Intl.DateTimeFormat('en', { day: 'numeric' }).format(date)
    const weekday = new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date)
    const month = new Intl.DateTimeFormat('en', { month: 'short' }).format(date)

    return `${day} ${weekday} ${month}`
}

const startOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1)

const BookingCalendarPanel = ({
    checkIn,
    checkOut,
    setCheckIn,
    setCheckOut,
    roomGuests,
    setRoomGuests,
    selectedRoomIndex,
    onSelectedRoomIndexChange,
    roomChoices,
    notice,
    isOpen,
    onOpenChange,
    onDateChange,
    onCheckAvailability,
}: BookingCalendarPanelProps) => {
    const [calendarMonth, setCalendarMonth] = useState(() =>
        startOfMonth(checkIn ? new Date(`${checkIn}T00:00:00`) : new Date()),
    )
    const [isClosing, setIsClosing] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const drawerRef = useRef<HTMLElement>(null)
    const closeTimerRef = useRef<number | null>(null)
    const scrollPositionRef = useRef(0)
    const today = dateValue(new Date())
    const days = useMemo(() => {
        const firstDay = startOfMonth(calendarMonth)
        const offset = firstDay.getDay()
        const count = new Date(
            calendarMonth.getFullYear(),
            calendarMonth.getMonth() + 1,
            0,
        ).getDate()

        return [
            ...Array.from({ length: offset }, () => null),
            ...Array.from({ length: count }, (_, index) =>
                new Date(
                    calendarMonth.getFullYear(),
                    calendarMonth.getMonth(),
                    index + 1,
                ),
            ),
        ]
    }, [calendarMonth])
    const nights =
        checkIn && checkOut
            ? Math.max(
                  0,
                  Math.round(
                      (new Date(`${checkOut}T00:00:00`).getTime() -
                          new Date(`${checkIn}T00:00:00`).getTime()) /
                          86_400_000,
                  ),
              )
            : 0
    const guestCount = roomGuests.reduce(
        (total, room) => total + room.adults + room.kids,
        0,
    )
    const selectedRoomCount = roomGuests.filter((room) => room.stayId !== null).length
    const dateLabel = !checkIn
        ? 'Select dates'
        : checkOut
          ? `${dateSummary(checkIn)} – ${dateSummary(checkOut)}`
          : `${dateSummary(checkIn)} – select check-out`
    const bookingSummary = [
        dateLabel,
        checkIn && checkOut
            ? `${nights} night${nights === 1 ? '' : 's'}`
            : null,
        `${guestCount} guest${guestCount === 1 ? '' : 's'}`,
        selectedRoomCount > 0
            ? `${selectedRoomCount} room${selectedRoomCount === 1 ? '' : 's'}`
            : null,
    ]
        .filter(Boolean)
        .join(' · ')
    const dateSummaryText = `${dateLabel}${
        nights > 0 ? ` · ${nights} night${nights === 1 ? '' : 's'}` : ''
    }`
    const firstRoomTitle = roomChoices.find(
        (choice) => choice.id === roomGuests[0]?.stayId,
    )?.title
    const roomSummaryText =
        roomGuests.length === 1
            ? `Room 1 · ${firstRoomTitle ?? 'Choose room or villa'} · ${guestCount} guest${
                  guestCount === 1 ? '' : 's'
              }`
            : `${roomGuests.length} rooms · ${guestCount} guests · ${selectedRoomCount} selected`

    const requestClose = useCallback(() => {
        if (isClosing) return

        setIsClosing(true)
        if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
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
            if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
        },
        [],
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
    }

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
                          [key]: Math.max(key === 'adults' ? 1 : 0, room[key] + amount),
                      }
                    : room,
            ),
        )
    }

    const addRoom = () => {
        onSelectedRoomIndexChange(roomGuests.length)
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
                className={`h-fit w-full rounded-2xl border border-[#d7e6ff] bg-[#f5f9ff] p-4 shadow-[0_10px_30px_rgba(8,117,249,0.08)] sm:p-5 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-20 max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0 max-lg:bg-[#f5f9ff]/95 max-lg:p-3 max-lg:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-lg:shadow-[0_-10px_30px_rgba(15,23,42,0.12)] max-lg:backdrop-blur-sm max-lg:transition-transform max-lg:duration-200 motion-reduce:transition-none ${
                    isOpen ? 'max-lg:translate-y-full' : ''
                }`}
            >
                <div className="max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-3">
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-[#006dfc]">
                            Your booking
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-slate-600 max-lg:truncate">
                            {bookingSummary}
                        </p>

                        {!isOpen && notice && (
                            <p role="status" className="mt-3 truncate text-xs leading-5 text-rose-600 max-lg:mt-1">
                                {notice}
                            </p>
                        )}
                    </div>

                    <button
                        ref={triggerRef}
                        type="button"
                        onClick={() => onOpenChange(true)}
                        aria-expanded={isOpen}
                        aria-controls="booking-drawer"
                        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#006dfc] px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] motion-reduce:transition-none max-lg:mt-0 max-lg:min-h-11 max-lg:w-auto max-lg:shrink-0 max-lg:px-4 max-lg:py-2.5"
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

            {!isOpen && <span id="booking-drawer" hidden />}

            {(isOpen || isClosing) &&
                createPortal(
                    <>
                        <div
                            aria-hidden="true"
                            onClick={requestClose}
                            className={`fixed inset-0 z-30 bg-slate-950/25 backdrop-blur-[1px] ${
                                isClosing
                                    ? 'booking-backdrop-exit'
                                    : 'booking-backdrop-enter'
                            }`}
                        />
                        <section
                            id="booking-drawer"
                            ref={drawerRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="booking-drawer-title"
                            data-lenis-prevent=""
                            tabIndex={-1}
                            className={`fixed left-0 top-[4.5rem] z-40 max-h-[calc(100dvh-4.5rem)] w-full overflow-y-auto overscroll-contain rounded-r-2xl border border-l-0 border-[#d7e6ff] bg-[#f5f9ff] shadow-[0_28px_90px_-24px_rgba(15,23,42,0.45)] outline-none sm:w-[calc(100vw-2rem)] lg:top-24 lg:max-h-[calc(100dvh-6rem)] lg:w-[min(72rem,calc(100vw-2rem))] ${
                                isClosing
                                    ? 'booking-drawer-exit'
                                    : 'booking-drawer-enter'
                            }`}
                        >
                            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-tr-2xl border-b border-[#d7e6ff] bg-[#f5f9ff]/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
                                <div className="min-w-0">
                                    <h2
                                        id="booking-drawer-title"
                                        className="text-sm font-semibold text-[#006dfc]"
                                    >
                                        Your booking
                                    </h2>
                                    <p className="mt-1 text-xs leading-5 text-slate-600">
                                        {bookingSummary}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={requestClose}
                                    aria-label="Close booking form"
                                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-[#006dfc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                >
                                    <X className="size-5" aria-hidden="true" />
                                </button>
                            </div>

                            {notice && (
                                <p
                                    role="status"
                                    className="mx-4 mt-4 text-xs leading-5 text-rose-600 sm:mx-6"
                                >
                                    {notice}
                                </p>
                            )}

                            <div
                                id="booking-panel-content"
                                className="grid gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start lg:gap-8"
                            >
                                <section
                                    aria-labelledby="booking-dates-heading"
                                    className="min-w-0"
                                >
                                    <h3
                                        id="booking-dates-heading"
                                        className="text-xs font-semibold text-slate-900"
                                    >
                                        Dates
                                    </h3>
                                    <p className="mt-0.5 text-[11px] text-slate-600">
                                        {dateSummaryText}
                                    </p>

                                    <div className="mt-3 flex items-center justify-between">
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
                                                calendarMonth <= startOfMonth(new Date())
                                            }
                                            aria-label="Previous month"
                                            className="flex size-11 items-center justify-center rounded-full text-slate-600 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:opacity-30"
                                        >
                                            <ChevronLeft className="size-5" aria-hidden="true" />
                                        </button>
                                        <h3 className="text-sm font-semibold text-slate-900">
                                            {new Intl.DateTimeFormat('en', {
                                                month: 'long',
                                                year: 'numeric',
                                            }).format(calendarMonth)}
                                        </h3>
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
                                            className="flex size-11 items-center justify-center rounded-full text-slate-600 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                        >
                                            <ChevronRight className="size-5" aria-hidden="true" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-7 gap-y-1 text-center">
                                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(
                                            (day) => (
                                                <span
                                                    key={day}
                                                    className="py-1.5 text-xs font-medium text-slate-700"
                                                >
                                                    {day}
                                                </span>
                                            ),
                                        )}
                                        {days.map((day, index) => {
                                            if (!day) return <span key={`empty-${index}`} />

                                            const value = dateValue(day)
                                            const weekend =
                                                day.getDay() === 0 || day.getDay() >= 5
                                            const selected = value === checkIn || value === checkOut
                                            const inRange = Boolean(
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
                                                    onClick={() => chooseDate(day)}
                                                    aria-label={new Intl.DateTimeFormat(
                                                        'en',
                                                        { dateStyle: 'full' },
                                                    ).format(day)}
                                                    aria-pressed={selected}
                                                    className={`mx-auto flex size-10 items-center justify-center rounded-md text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:text-slate-300 sm:size-9 sm:text-[13px] ${
                                                        selected
                                                            ? 'bg-[#006dfc] font-semibold text-white'
                                                            : inRange
                                                              ? 'bg-blue-100 text-blue-900'
                                                              : weekend
                                                                ? 'bg-rose-100 text-slate-700 hover:bg-rose-200'
                                                                : 'text-slate-700 hover:bg-white'
                                                    }`}
                                                >
                                                    {day.getDate()}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-b border-slate-200 pb-3 text-[11px] text-slate-600">
                                        <span className="inline-flex items-center gap-1">
                                            <span className="size-2.5 rounded-sm border border-slate-300" />
                                            Weekday&nbsp; Mon–Thu
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <span className="size-2.5 rounded-sm bg-rose-200" />
                                            Weekend&nbsp; Fri–Sun
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] divide-x divide-slate-200 border-y border-slate-300 py-2.5 text-xs">
                                        {[
                                            { label: 'Check-in', value: checkIn },
                                            { label: 'Check-out', value: checkOut },
                                        ].map(({ label, value }) => (
                                            <div
                                                key={label}
                                                className="min-w-0 px-1.5 first:pl-0 last:pr-0"
                                            >
                                                <p className="font-medium leading-tight text-slate-600">
                                                    {label}
                                                </p>
                                                <p className="mt-1 flex min-w-0 items-center gap-1 whitespace-nowrap font-semibold leading-tight text-slate-900 sm:text-[13px]">
                                                    <CalendarDays
                                                        className="size-3.5 shrink-0 text-slate-500"
                                                        aria-hidden="true"
                                                    />
                                                    {value ? dateSummary(value) : 'Select date'}
                                                </p>
                                            </div>
                                        ))}
                                        <div className="min-w-0 px-1.5 pr-0">
                                            <p className="font-medium leading-tight text-slate-600">
                                                Nights
                                            </p>
                                            <p className="mt-1 flex items-center gap-1 font-semibold leading-tight text-slate-900 sm:text-[13px]">
                                                <CalendarDays
                                                    className="size-3.5 shrink-0 text-slate-500"
                                                    aria-hidden="true"
                                                />
                                                {nights || '—'}
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section
                                    aria-labelledby="booking-rooms-heading"
                                    className="min-w-0 lg:border-l lg:border-[#d7e6ff] lg:pl-6"
                                >
                                    <h3
                                        id="booking-rooms-heading"
                                        className="text-xs font-semibold text-slate-900"
                                    >
                                        Rooms &amp; guests
                                    </h3>
                                    <p className="mt-0.5 text-[11px] text-slate-600">
                                        {roomSummaryText}
                                    </p>

                                    <div className="mt-3 overflow-visible">
                                        {roomGuests.map((room, index) => {
                                            const villaAssignedElsewhere = roomGuests.some(
                                                (otherRoom, otherIndex) =>
                                                    otherIndex !== index &&
                                                    roomChoices.some(
                                                        (choice) =>
                                                            choice.id === otherRoom.stayId &&
                                                            choice.category === 'exclusive',
                                                    ),
                                            )
                                            const otherRoomsAssigned = roomGuests.some(
                                                (otherRoom, otherIndex) =>
                                                    otherIndex !== index &&
                                                    otherRoom.stayId !== null &&
                                                    roomChoices.some(
                                                        (choice) =>
                                                            choice.id === otherRoom.stayId &&
                                                            choice.category === 'public',
                                                    ),
                                            )

                                            return (
                                                <section
                                                    key={index}
                                                    aria-label={`Room ${index + 1} guests`}
                                                    className={`border-b border-slate-200 py-3 last:border-0 ${
                                                        selectedRoomIndex === index
                                                            ? 'rounded-md bg-blue-50/60 px-2'
                                                            : ''
                                                    }`}
                                                >
                                                    <div className="mb-2 flex items-center justify-between gap-2">
                                                        <label
                                                            htmlFor={`booking-room-${index}`}
                                                            className="text-xs font-medium text-slate-700"
                                                        >
                                                            Room {index + 1} / selected room
                                                        </label>
                                                        {roomGuests.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setRoomGuests((current) =>
                                                                        current.filter(
                                                                            (_, roomIndex) =>
                                                                                roomIndex !== index,
                                                                        ),
                                                                    )
                                                                    const nextSelectedIndex =
                                                                        selectedRoomIndex > index
                                                                            ? selectedRoomIndex - 1
                                                                            : selectedRoomIndex ===
                                                                                index
                                                                              ? Math.min(
                                                                                    index,
                                                                                    roomGuests.length - 2,
                                                                                )
                                                                              : selectedRoomIndex
                                                                    onSelectedRoomIndexChange(
                                                                        Math.max(
                                                                            0,
                                                                            nextSelectedIndex,
                                                                        ),
                                                                    )
                                                                }}
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
                                                    <select
                                                        id={`booking-room-${index}`}
                                                        value={room.stayId ?? ''}
                                                        onFocus={() =>
                                                            onSelectedRoomIndexChange(index)
                                                        }
                                                        onChange={(event) => {
                                                            onSelectedRoomIndexChange(index)
                                                            setRoomGuests((current) =>
                                                                current.map((item, roomIndex) =>
                                                                    roomIndex === index
                                                                        ? {
                                                                              ...item,
                                                                              stayId:
                                                                                  event.target
                                                                                      .value || null,
                                                                          }
                                                                        : item,
                                                                ),
                                                            )
                                                        }}
                                                        className="mb-2 min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#006dfc] focus:outline-none focus:ring-1 focus:ring-[#006dfc]"
                                                    >
                                                        <option value="">
                                                            Choose room or villa
                                                        </option>
                                                        {roomChoices.map((choice) => {
                                                            const selectedElsewhere =
                                                                roomGuests.some(
                                                                    (otherRoom, otherIndex) =>
                                                                        otherIndex !== index &&
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
                                                    {(['adults', 'kids'] as const).map(
                                                        (guestType) => (
                                                            <div
                                                                key={guestType}
                                                                className="flex min-h-11 items-center justify-between py-1 text-xs text-slate-600"
                                                            >
                                                                <span>
                                                                    {guestType === 'adults'
                                                                        ? 'Adults'
                                                                        : 'Kids'}
                                                                </span>
                                                                <span className="inline-flex items-center rounded-md border border-slate-200 bg-white">
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
                                                                        className="inline-flex size-11 items-center justify-center rounded-l-md text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#006dfc]"
                                                                    >
                                                                        <Minus
                                                                            className="size-4"
                                                                            aria-hidden="true"
                                                                        />
                                                                    </button>
                                                                    <span className="min-w-8 text-center text-sm font-semibold text-slate-800">
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
                                                                        className="inline-flex size-11 items-center justify-center rounded-r-md text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#006dfc]"
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
                                        className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-[#006dfc] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                    >
                                        + Add room
                                    </button>
                                </section>
                            </div>

                            <div className="sticky bottom-0 z-10 border-t border-[#d7e6ff] bg-[#f5f9ff]/95 px-4 pb-4 pt-3 backdrop-blur-sm sm:px-6 sm:pb-5">
                                <button
                                    type="button"
                                    onClick={onCheckAvailability}
                                    className="min-h-12 w-full rounded-lg bg-[#006dfc] px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                >
                                    Continue
                                </button>
                            </div>
                        </section>
                    </>,
                    document.body,
                )}
        </>
    )
}

export default BookingCalendarPanel
