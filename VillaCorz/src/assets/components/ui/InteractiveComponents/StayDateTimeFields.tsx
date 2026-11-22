import { useId, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
    DEFAULT_CHECK_IN_TIME,
    formatPaidDays,
    formatStayDateTime,
    getStayWindow,
    MAX_PAID_DAYS,
    MIN_PAID_DAYS,
    OCCUPANCY_HOURS,
    paidDayStartDates,
    paidDaysFromCheckoutDate,
    PAID_DAY_HINT,
    phtDateKey,
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
    const [selectionStage, setSelectionStage] = useState<'start' | 'end'>('start')
    const [selectedCheckoutDate, setSelectedCheckoutDate] = useState('')
    const [hasSelectedCheckout, setHasSelectedCheckout] = useState(false)
    const [rangeError, setRangeError] = useState('')
    const fieldId = useId()
    const checkInDateId = `${fieldId}-check-in-date`
    const checkInTimeId = `${fieldId}-check-in-time`
    const checkoutLabelId = `${fieldId}-checkout`
    const timeHintId = `${fieldId}-time-hint`
    const stagePromptId = `${fieldId}-stage`
    const unavailableSet = new Set(unavailableDates)
    const isUnavailable = (value: string) => unavailableSet.has(value)
    const stayWindow = getStayWindow(fields)
    const message = error || rangeError || stayWindow.error
    const today = phtToday()
    const referenceDate = fields.checkInDate && fields.checkInDate >= today
        ? fields.checkInDate
        : today
    const calendarMonth = addMonths(monthStart(referenceDate), monthOffset)
    const minMonth = monthStart(today)
    const months = compact
        ? [calendarMonth]
        : [calendarMonth, addMonths(calendarMonth, 1)]
    const derivedCheckoutDate = stayWindow.valid
        ? phtDateKey(stayWindow.checkOut)
        : ''
    const activeCheckoutDate = hasSelectedCheckout
        ? selectedCheckoutDate
        : derivedCheckoutDate
    const rangeEnd = selectionStage === 'end' ? '' : activeCheckoutDate
    const stagePrompt = selectionStage === 'end'
        ? 'Select check-out date'
        : 'Select check-in date'

    const beginSelection = (value: string) => {
        setMonthOffset(0)
        setSelectionStage('end')
        setSelectedCheckoutDate('')
        setHasSelectedCheckout(false)
        setRangeError('')
        onChange({ checkInDate: value, paidDays: MIN_PAID_DAYS })
    }

    const updateFields = (patch: Partial<StayDateFields>) => {
        const nextCheckIn = patch.checkInDate

        if (nextCheckIn && isUnavailable(nextCheckIn)) {
            onUnavailableDate?.(nextCheckIn)
            return
        }

        if ('checkInDate' in patch) {
            if (!nextCheckIn) {
                setSelectionStage('start')
                setSelectedCheckoutDate('')
                setHasSelectedCheckout(false)
                setRangeError('')
                onChange({ checkInDate: '', paidDays: MIN_PAID_DAYS })
                return
            }

            beginSelection(nextCheckIn)
            return
        }

        if ('checkInTime' in patch && hasSelectedCheckout && selectedCheckoutDate) {
            const nextCheckInTime = patch.checkInTime || DEFAULT_CHECK_IN_TIME
            const nextPaidDays = paidDaysFromCheckoutDate(
                fields.checkInDate,
                nextCheckInTime,
                selectedCheckoutDate,
            )

            if (nextPaidDays < MIN_PAID_DAYS || nextPaidDays > MAX_PAID_DAYS) {
                setRangeError(
                    `Choose a check-out date within ${MAX_PAID_DAYS} paid days.`,
                )
                return
            }

            const blocked = paidDayStartDates(
                { ...fields, checkInTime: nextCheckInTime },
                nextPaidDays,
            ).find(isUnavailable)

            if (blocked) {
                onUnavailableDate?.(blocked)
                setRangeError('Your selected range includes a booked date.')
                return
            }

            setRangeError('')
            onChange({ ...patch, paidDays: nextPaidDays })
            return
        }

        setRangeError('')
        onChange(patch)
    }

    const selectDate = (value: string) => {
        if (isUnavailable(value)) {
            onUnavailableDate?.(value)
            return
        }

        if (
            selectionStage === 'start' ||
            !fields.checkInDate ||
            value <= fields.checkInDate
        ) {
            beginSelection(value)
            return
        }

        const nextPaidDays = paidDaysFromCheckoutDate(
            fields.checkInDate,
            fields.checkInTime,
            value,
        )

        if (nextPaidDays < MIN_PAID_DAYS || nextPaidDays > MAX_PAID_DAYS) {
            setRangeError(
                `Choose a check-out date within ${MAX_PAID_DAYS} paid days.`,
            )
            return
        }

        const blocked = paidDayStartDates(fields, nextPaidDays).find(isUnavailable)

        if (blocked) {
            onUnavailableDate?.(blocked)
            setRangeError('Your selected range includes a booked date.')
            return
        }

        setMonthOffset(0)
        setSelectionStage('start')
        setSelectedCheckoutDate(value)
        setHasSelectedCheckout(true)
        setRangeError('')
        onChange({ paidDays: nextPaidDays })
    }

    return (
        <section
            aria-labelledby={compact ? undefined : 'stay-datetime-heading'}
            className={
                compact
                    ? `min-w-0 font-poppins ${scrollable ? 'max-h-[min(58svh,430px)] overflow-y-auto pr-1' : ''}`
                    : 'rounded-2xl border border-[#d7e6ff] bg-[#f5f9ff] p-4 font-poppins shadow-[0_10px_30px_rgba(8,117,249,0.08)] sm:p-5'
            }
        >
            {!compact && (
                <>
                    <h2 id="stay-datetime-heading" className="font-jakarta text-sm font-semibold text-[#006dfc] sm:text-base">
                        Your booking
                    </h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600 sm:text-sm">
                        Pick your check-in date, then your check-out date in
                        Philippine time (PHT, UTC+8). Check-out time is derived
                        from the 22-hour paid-day rule.
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
                    <p
                        id={stagePromptId}
                        aria-live="polite"
                        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs lg:text-sm"
                    >
                        {stagePrompt}
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
                            <h3 className="mb-2 text-center font-jakarta text-xs font-semibold text-slate-700 sm:text-sm">
                                {monthLabel(month)}
                            </h3>
                            <div
                                className="grid grid-cols-7 gap-y-1 text-center"
                                aria-describedby={stagePromptId}
                            >
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(
                                    (day) => (
                                        <span
                                            key={day}
                                            className="py-1 text-xs font-medium text-slate-500 sm:text-sm"
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
                                        (selectionStage === 'start' &&
                                            day.value === rangeEnd)
                                    const inRange = Boolean(
                                        fields.checkInDate &&
                                            rangeEnd &&
                                            day.value > fields.checkInDate &&
                                            day.value < rangeEnd,
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
                                            className={`mx-auto flex size-8 items-center justify-center rounded-md font-jakarta text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:text-slate-300 sm:size-9 sm:text-sm ${
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

                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-b border-[#d7e6ff] pb-3 text-xs text-slate-600 sm:text-sm">
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
                        Check-in
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="size-2.5 rounded-sm bg-blue-100" />
                        Selected range
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
            </div>

            <div className="mt-3 border-t border-[#d7e6ff] pt-3">
                <span id={checkoutLabelId} className="booking-field-label">
                    Check-out (derived)
                </span>
                <div
                    aria-labelledby={checkoutLabelId}
                    className="booking-input flex min-h-11 items-center font-jakarta text-slate-800"
                >
                    {stayWindow.valid
                        ? formatStayDateTime(stayWindow.checkOut)
                        : 'Not selected'}
                </div>
            </div>

            <p
                id={timeHintId}
                className="mt-2 text-[13px] leading-relaxed text-slate-500 sm:text-sm"
            >
                PHT (UTC+8) · 24-hour HH:MM in the check-in field
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500 sm:text-sm">
                {PAID_DAY_HINT}
            </p>

            {message ? (
                <p role="status" className="mt-3 text-[13px] leading-relaxed text-rose-600 sm:text-sm">
                    {message}
                </p>
            ) : (
                <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 font-jakarta text-[13px] leading-relaxed text-slate-600 sm:text-sm">
                    {formatStayDateTime(stayWindow.checkIn)} → {formatStayDateTime(stayWindow.checkOut)}
                    <br />
                    {formatPaidDays(stayWindow.paidDays)} · {OCCUPANCY_HOURS}h
                    occupancy each
                </p>
            )}
        </section>
    )
}

export default StayDateTimeFields
