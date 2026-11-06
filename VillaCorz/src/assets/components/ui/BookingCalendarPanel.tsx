import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Minus,
    Plus,
    Trash2,
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
    onDateChange,
    onCheckAvailability,
}: BookingCalendarPanelProps) => {
    const [calendarMonth, setCalendarMonth] = useState(() =>
        startOfMonth(checkIn ? new Date(`${checkIn}T00:00:00`) : new Date()),
    )
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
        <aside
            aria-label="Booking calendar"
            className="h-fit self-start rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.12)] sm:p-5 lg:sticky lg:top-28"
        >
            <p className="mb-4 text-xs font-semibold text-[#006dfc]">Select dates</p>

            <div className="mb-3 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() =>
                        setCalendarMonth((month) =>
                            new Date(month.getFullYear(), month.getMonth() - 1, 1),
                        )
                    }
                    disabled={calendarMonth <= startOfMonth(new Date())}
                    aria-label="Previous month"
                    className="flex size-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                <h2 className="text-xs font-semibold text-slate-900">
                    {new Intl.DateTimeFormat('en', {
                        month: 'long',
                        year: 'numeric',
                    }).format(calendarMonth)}
                </h2>
                <button
                    type="button"
                    onClick={() =>
                        setCalendarMonth((month) =>
                            new Date(month.getFullYear(), month.getMonth() + 1, 1),
                        )
                    }
                    aria-label="Next month"
                    className="flex size-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <span
                        key={day}
                        className="py-1.5 text-[11px] font-medium text-slate-700"
                    >
                        {day}
                    </span>
                ))}
                {days.map((day, index) => {
                    if (!day) return <span key={`empty-${index}`} />

                    const value = dateValue(day)
                    const weekend = day.getDay() === 0 || day.getDay() >= 5
                    const selected = value === checkIn || value === checkOut
                    const inRange = Boolean(checkIn && checkOut && value > checkIn && value < checkOut)
                    const disabled = value < today

                    return (
                        <button
                            key={value}
                            type="button"
                            disabled={disabled}
                            onClick={() => chooseDate(day)}
                            aria-label={new Intl.DateTimeFormat('en', {
                                dateStyle: 'full',
                            }).format(day)}
                            aria-pressed={selected}
                            className={`mx-auto flex size-8 items-center justify-center rounded-sm text-xs transition disabled:cursor-not-allowed disabled:text-slate-300 ${
                                selected
                                    ? 'bg-[#0875f9] font-semibold text-white'
                                    : inRange
                                      ? 'bg-blue-100 text-blue-900'
                                      : weekend
                                        ? 'bg-rose-100 text-slate-700 hover:bg-rose-200'
                                        : 'text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            {day.getDate()}
                        </button>
                    )
                })}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-200 pb-3 text-[9px] text-slate-600">
                <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-sm border border-slate-300" />
                    Weekday&nbsp; Mon–Thu
                </span>
                <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-sm bg-rose-200" />
                    Weekend&nbsp; Fri–Sun
                </span>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-300 py-2 text-[10px]">
                {[
                    { label: 'Check-in', value: checkIn },
                    { label: 'Check-out', value: checkOut },
                ].map(({ label, value }) => (
                    <div key={label} className="min-w-0 px-1.5 first:pl-0 last:pr-0">
                        <p className="font-medium leading-tight text-slate-600">{label}</p>
                        <p className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold leading-tight text-slate-900 sm:text-[11px]">
                            <CalendarDays
                                className="size-3 shrink-0 text-slate-500"
                                aria-hidden="true"
                            />
                            {value ? dateSummary(value) : 'Select date'}
                        </p>
                    </div>
                ))}
                <div className="min-w-0 px-1.5 pr-0">
                    <p className="font-medium leading-tight text-slate-600">Nights</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold leading-tight text-slate-900 sm:text-[11px]">
                        <CalendarDays
                            className="size-3 shrink-0 text-slate-500"
                            aria-hidden="true"
                        />
                        {nights || '—'}
                    </p>
                </div>
            </div>

            <div className="max-h-44 overflow-y-auto">
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
                            selectedRoomIndex === index ? 'rounded-md bg-blue-50/60 px-2' : ''
                        }`}
                    >
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <label
                                htmlFor={`booking-room-${index}`}
                                className="text-[10px] font-medium text-slate-700"
                            >
                                Room {index + 1} / selected room
                            </label>
                            {roomGuests.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRoomGuests((current) =>
                                            current.filter((_, roomIndex) => roomIndex !== index),
                                        )
                                        const nextSelectedIndex =
                                            selectedRoomIndex > index
                                                ? selectedRoomIndex - 1
                                                : selectedRoomIndex === index
                                                  ? Math.min(index, roomGuests.length - 2)
                                                  : selectedRoomIndex
                                        onSelectedRoomIndexChange(
                                            Math.max(0, nextSelectedIndex),
                                        )
                                    }}
                                    aria-label={`Remove room ${index + 1}`}
                                    className="text-slate-400 transition hover:text-rose-600"
                                >
                                    <Trash2 className="size-3.5" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                        <select
                            id={`booking-room-${index}`}
                            value={room.stayId ?? ''}
                            onFocus={() => onSelectedRoomIndexChange(index)}
                            onChange={(event) => {
                                onSelectedRoomIndexChange(index)
                                setRoomGuests((current) =>
                                    current.map((item, roomIndex) =>
                                        roomIndex === index
                                            ? { ...item, stayId: event.target.value || null }
                                            : item,
                                    ),
                                )
                            }}
                            className="mb-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-700 focus:border-[#0875f9] focus:outline-none"
                        >
                            <option value="">Choose a room</option>
                            {roomChoices.map((choice) => {
                                const selectedElsewhere = roomGuests.some(
                                    (otherRoom, otherIndex) =>
                                        otherIndex !== index &&
                                        otherRoom.stayId === choice.id,
                                )
                                return (
                                    <option
                                        key={choice.id}
                                        value={choice.id}
                                        disabled={
                                            selectedElsewhere ||
                                            (choice.category === 'exclusive' &&
                                                otherRoomsAssigned) ||
                                            (choice.category === 'public' &&
                                                villaAssignedElsewhere)
                                        }
                                    >
                                        {choice.title}
                                    </option>
                                )
                            })}
                        </select>
                        {(['adults', 'kids'] as const).map((guestType) => (
                            <div
                                key={guestType}
                                className="flex items-center justify-between py-1 text-[10px] text-slate-600"
                            >
                                <span>{guestType === 'adults' ? 'Adults' : 'Kids'}</span>
                                <span className="inline-flex items-center rounded border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateGuestCount(index, guestType, -1)
                                        }
                                        aria-label={`Decrease ${guestType} for room ${index + 1}`}
                                        className="px-2 py-1 text-slate-500 hover:bg-slate-50"
                                    >
                                        <Minus className="size-3" aria-hidden="true" />
                                    </button>
                                    <span className="min-w-7 text-center">
                                        {room[guestType]}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateGuestCount(index, guestType, 1)
                                        }
                                        aria-label={`Increase ${guestType} for room ${index + 1}`}
                                        className="px-2 py-1 text-slate-500 hover:bg-slate-50"
                                    >
                                        <Plus className="size-3" aria-hidden="true" />
                                    </button>
                                </span>
                            </div>
                        ))}
                    </section>
                    )
                })}
            </div>

            <button
                type="button"
                onClick={addRoom}
                className="mt-2 text-[10px] font-medium text-[#006dfc] hover:underline"
            >
                + Add room
            </button>

            {notice && (
                <p role="status" className="mt-2 text-[10px] leading-4 text-rose-600">
                    {notice}
                </p>
            )}
            <button
                type="button"
                onClick={onCheckAvailability}
                className="mt-4 w-full rounded-full bg-[#0875f9] px-4 py-3 text-[11px] font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
                Continue
            </button>
        </aside>
    )
}

export default BookingCalendarPanel
