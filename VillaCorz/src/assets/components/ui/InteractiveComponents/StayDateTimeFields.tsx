import { useId, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
    DEFAULT_CHECK_IN_TIME,
    DEFAULT_CHECK_OUT_TIME,
    formatStayDateTime,
    getStayWindow,
    phtToday,
    type StayDateFields,
} from '../../../../lib/stayDateTime'

type StayDateTimeFieldsProps = {
    fields: StayDateFields
    onChange: (patch: Partial<StayDateFields>) => void
    error?: string
    compact?: boolean
    scrollable?: boolean
    unavailableDates?: string[]
    onUnavailableDate?: (date: string) => void
}

const monthStart = (value: string) =>
    new Date(`${value.slice(0, 7)}-01T00:00:00Z`)

const addMonths = (date: Date, amount: number) =>
    new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1),
    )

const monthLabel = (date: Date) =>
    new Intl.DateTimeFormat('en-PH', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(date)

const dayLabel = (value: string) =>
    new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'full',
        timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`))

const calendarDays = (month: Date) => {
    const offset = month.getUTCDay()
    const total = new Date(
        Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
    ).getUTCDate()

    return [
        ...Array.from({ length: offset }, () => null),
        ...Array.from({ length: total }, (_, index) => {
            const value = `${month.getUTCFullYear()}-${String(
                month.getUTCMonth() + 1,
            ).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
            const weekday = new Date(`${value}T00:00:00Z`).getUTCDay()
            return { value, day: index + 1, weekend: weekday === 0 || weekday >= 5 }
        }),
    ]
}

const StayDateTimeFields = ({
    fields,
    onChange,
    error = '',
    compact = false,
    scrollable = compact,
    unavailableDates = [],
    onUnavailableDate,
}: StayDateTimeFieldsProps) => {
    const [monthOffset, setMonthOffset] = useState(0)
    const fieldId = useId()
    const checkInDateId = `${fieldId}-check-in-date`
    const checkInTimeId = `${fieldId}-check-in-time`
    const checkOutDateId = `${fieldId}-check-out-date`
    const checkOutTimeId = `${fieldId}-check-out-time`
    const timeHintId = `${fieldId}-time-hint`
    const unavailableSet = new Set(unavailableDates)
    const isUnavailable = (value: string) => unavailableSet.has(value)
    const stayWindow = getStayWindow(fields)
    const message = error || stayWindow.error
    const today = phtToday()
    const calendarMonth = addMonths(monthStart(fields.checkInDate || today), monthOffset)
    const minMonth = monthStart(today)
    const months = compact
        ? [calendarMonth]
        : [calendarMonth, addMonths(calendarMonth, 1)]

    const updateFields = (patch: Partial<StayDateFields>) => {
        const nextCheckIn = patch.checkInDate
        const nextCheckOut = patch.checkOutDate

        if (nextCheckIn && isUnavailable(nextCheckIn)) {
            onUnavailableDate?.(nextCheckIn)
            return
        }

        if (nextCheckOut && isUnavailable(nextCheckOut)) {
            onUnavailableDate?.(nextCheckOut)
            return
        }

        if ('checkInDate' in patch) setMonthOffset(0)
        onChange(patch)
    }

    const selectDate = (value: string) => {
        if (isUnavailable(value)) {
            onUnavailableDate?.(value)
            return
        }

        if (
            !fields.checkInDate ||
            fields.checkOutDate ||
            value <= fields.checkInDate
        ) {
            setMonthOffset(0)
            onChange({ checkInDate: value, checkOutDate: '' })
            return
        }

        onChange({ checkOutDate: value })
    }

    return (
        <section
            aria-labelledby={compact ? undefined : 'stay-datetime-heading'}
            className={
                compact
                    ? `min-w-0 ${scrollable ? 'max-h-[70vh] overflow-y-auto pr-1' : ''}`
                    : 'rounded-2xl border border-[#d7e6ff] bg-[#f5f9ff] p-4 shadow-[0_10px_30px_rgba(8,117,249,0.08)] sm:p-5'
            }
        >
            {!compact && (
                <>
                    <h2 id="stay-datetime-heading" className="text-sm font-semibold text-[#006dfc]">
                        Your booking
                    </h2>
                    <p className="mt-1 text-[11px] leading-4 text-slate-600">
                        Pick your dates on the calendar, then set the exact check-in and check-out time in Philippine time (PHT, UTC+8).
                    </p>
                </>
            )}

            <div className="mt-3">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setMonthOffset((offset) => offset - 1)}
                        disabled={calendarMonth <= minMonth}
                        aria-label="Previous month"
                        className="flex size-11 items-center justify-center rounded-full text-slate-600 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <ChevronLeft className="size-5" aria-hidden="true" />
                    </button>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {compact ? monthLabel(calendarMonth) : 'Select dates'}
                    </p>
                    <button
                        type="button"
                        onClick={() => setMonthOffset((offset) => offset + 1)}
                        aria-label="Next month"
                        className="flex size-11 items-center justify-center rounded-full text-slate-600 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                    >
                        <ChevronRight className="size-5" aria-hidden="true" />
                    </button>
                </div>

                <div
                    className={`mt-2 grid gap-4 ${
                        compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
                    }`}
                >
                    {months.map((month) => (
                        <div key={month.toISOString()}>
                            <h3 className="mb-2 text-center text-[11px] font-semibold text-slate-700">
                                {monthLabel(month)}
                            </h3>
                            <div className="grid grid-cols-7 gap-y-1 text-center">
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(
                                    (day) => (
                                        <span
                                            key={day}
                                            className="py-1 text-[9px] font-medium text-slate-500"
                                        >
                                            {day}
                                        </span>
                                    ),
                                )}
                                {calendarDays(month).map((day, index) => {
                                    if (!day) {
                                        return <span key={`empty-${index}`} />
                                    }

                                    const selected =
                                        day.value === fields.checkInDate ||
                                        day.value === fields.checkOutDate
                                    const inRange = Boolean(
                                        fields.checkInDate &&
                                            fields.checkOutDate &&
                                            day.value > fields.checkInDate &&
                                            day.value < fields.checkOutDate,
                                    )
                                    const unavailable = isUnavailable(day.value)
                                    const disabled = day.value < today || unavailable

                                    return (
                                        <button
                                            key={day.value}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => selectDate(day.value)}
                                            aria-label={`${dayLabel(day.value)}${unavailable ? ', unavailable' : ''}`}
                                            aria-pressed={selected && !unavailable}
                                            className={`mx-auto flex size-9 items-center justify-center rounded-md text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:text-slate-300 ${
                                                unavailable
                                                    ? 'bg-slate-300 text-slate-500 line-through'
                                                    : selected
                                                      ? 'bg-[#006dfc] font-semibold text-white'
                                                      : inRange
                                                        ? 'bg-blue-100 text-blue-900'
                                                        : day.weekend
                                                          ? 'bg-rose-100 text-slate-700 hover:bg-rose-200'
                                                          : 'text-slate-700 hover:bg-white'
                                            }`}
                                        >
                                            {day.day}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-b border-[#d7e6ff] pb-3 text-[10px] text-slate-600">
                    <span className="inline-flex items-center gap-1">
                        <span className="size-2.5 rounded-sm border border-slate-300" />
                        Weekday
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="size-2.5 rounded-sm bg-rose-100" />
                        Weekend
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="size-2.5 rounded-sm bg-[#006dfc]" />
                        Selected
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="size-2.5 rounded-sm bg-slate-300" />
                        Booked
                    </span>
                </div>
            </div>

            <div
                className={`mt-3 grid gap-3 ${
                    compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
                }`}
            >
                <div>
                    <label htmlFor={checkInDateId} className="booking-field-label">
                        Check-in date
                    </label>
                    <input
                        id={checkInDateId}
                        type="date"
                        min={today}
                        aria-invalid={Boolean(
                            fields.checkInDate &&
                                isUnavailable(fields.checkInDate),
                        )}
                        value={fields.checkInDate}
                        onChange={(event) =>
                            updateFields({ checkInDate: event.target.value })
                        }
                        className="booking-input"
                    />
                </div>
                <div>
                    <label htmlFor={checkInTimeId} className="booking-field-label">
                        Check-in time
                    </label>
                    <input
                        id={checkInTimeId}
                        type="time"
                        value={fields.checkInTime || DEFAULT_CHECK_IN_TIME}
                        onChange={(event) =>
                            updateFields({
                                checkInTime:
                                    event.target.value || DEFAULT_CHECK_IN_TIME,
                            })
                        }
                        aria-describedby={timeHintId}
                        className="booking-input"
                    />
                </div>
                <div>
                    <label htmlFor={checkOutDateId} className="booking-field-label">
                        Check-out date
                    </label>
                    <input
                        id={checkOutDateId}
                        type="date"
                        min={fields.checkInDate || today}
                        aria-invalid={Boolean(
                            fields.checkOutDate &&
                                isUnavailable(fields.checkOutDate),
                        )}
                        value={fields.checkOutDate}
                        onChange={(event) =>
                            updateFields({ checkOutDate: event.target.value })
                        }
                        className="booking-input"
                    />
                </div>
                <div>
                    <label htmlFor={checkOutTimeId} className="booking-field-label">
                        Check-out time
                    </label>
                    <input
                        id={checkOutTimeId}
                        type="time"
                        value={fields.checkOutTime || DEFAULT_CHECK_OUT_TIME}
                        onChange={(event) =>
                            updateFields({
                                checkOutTime:
                                    event.target.value || DEFAULT_CHECK_OUT_TIME,
                            })
                        }
                        aria-describedby={timeHintId}
                        className="booking-input"
                    />
                </div>
            </div>

            <p
                id={timeHintId}
                className="mt-2 text-[10px] leading-4 text-slate-500"
            >
                PHT (UTC+8) · 24-hour HH:MM in the fields
            </p>

            {message ? (
                <p role="status" className="mt-3 text-xs leading-5 text-rose-600">
                    {message}
                </p>
            ) : (
                <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-[11px] leading-5 text-slate-600">
                    {formatStayDateTime(stayWindow.checkIn)} → {formatStayDateTime(stayWindow.checkOut)}
                    <br />
                    {stayWindow.nights} night{stayWindow.nights === 1 ? '' : 's'} · same-day stays are charged one night
                </p>
            )}
        </section>
    )
}

export default StayDateTimeFields
