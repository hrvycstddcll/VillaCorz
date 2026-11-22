import { useId, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
    addPhtDays,
    DEFAULT_CHECK_IN_TIME,
    formatPaidDays,
    formatStayDateTime,
    getStayWindow,
    isPastCheckIn,
    MAX_PAID_DAYS,
    MIN_PAID_DAYS,
    OCCUPANCY_HOURS,
    paidDayStartDates,
    paidDaysFromCheckoutDate,
    PAID_DAY_HINT,
    phtDateKey,
    splitPhtDateTime,
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
    const message =
        error ||
        rangeError ||
        (isPastCheckIn(fields)
            ? 'Check-in time has passed. Choose a later date or time.'
            : '') ||
        stayWindow.error
    const nowInPht = splitPhtDateTime(new Date().toISOString())
    const today = nowInPht.date
    const minDate = isPastCheckIn({
        checkInDate: today,
        checkInTime: fields.checkInTime || DEFAULT_CHECK_IN_TIME,
    })
        ? addPhtDays(today, 1)
        : today
    const referenceDate = fields.checkInDate && fields.checkInDate >= minDate
        ? fields.checkInDate
        : minDate
    const calendarMonth = addMonths(monthStart(referenceDate), monthOffset)
    const minMonth = monthStart(minDate)
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
                    ? `min-w-0 font-poppins ${scrollable ? 'booking-scrollbar max-h-[min(38svh,300px)] overflow-y-auto pr-0.5' : ''}`
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

            <div className={compact ? 'mt-2' : 'mt-3'}>
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setMonthOffset((offset) => offset - 1)}
                        disabled={calendarMonth <= minMonth}
                        aria-label="Previous month"
                        className={`flex items-center justify-center rounded-full text-slate-600 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:opacity-30 ${compact ? 'size-8 sm:size-9 md:size-8' : 'size-11'}`}
                    >
                        <ChevronLeft
                            className={compact ? 'size-4' : 'size-5'}
                            aria-hidden="true"
                        />
                    </button>
                    <p
                        id={stagePromptId}
                        aria-live="polite"
                        className={`font-semibold uppercase tracking-[0.14em] text-slate-500 ${compact ? 'text-[10px] sm:text-[11px] md:text-[10px]' : 'text-xs sm:text-sm'}`}
                    >
                        {stagePrompt}
                    </p>
                    <button
                        type="button"
                        onClick={() => setMonthOffset((offset) => offset + 1)}
                        aria-label="Next month"
                        className={`flex items-center justify-center rounded-full text-slate-600 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] ${compact ? 'size-8 sm:size-9 md:size-8' : 'size-11'}`}
                    >
                        <ChevronRight
                            className={compact ? 'size-4' : 'size-5'}
                            aria-hidden="true"
                        />
                    </button>
                </div>

                <div
                    className={`mt-2 grid ${
                        compact
                            ? 'grid-cols-1 gap-2'
                            : 'grid-cols-1 gap-4 sm:grid-cols-2'
                    }`}
                >
                    {months.map((month) => (
                        <div key={month.toISOString()}>
                            <h3 className={`mb-1.5 text-center font-jakarta font-semibold text-slate-700 ${compact ? 'text-[11px] sm:text-xs md:text-[11px]' : 'text-xs sm:text-sm'}`}>
                                {monthLabel(month)}
                            </h3>
                            <div
                                className={`grid grid-cols-7 text-center ${compact ? 'gap-y-0.5' : 'gap-y-1'}`}
                                aria-describedby={stagePromptId}
                            >
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(
                                    (day) => (
                                        <span
                                            key={day}
                                            className={`py-0.5 font-medium text-slate-500 ${compact ? 'text-[10px]' : 'text-xs sm:text-sm'}`}
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
                                    const disabled = day.value < minDate || unavailable

                                    return (
                                        <button
                                            key={day.value}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => selectDate(day.value)}
                                            aria-label={`${dayLabel(day.value)}${unavailable ? ', unavailable' : ''}`}
                                            aria-pressed={selected && !unavailable}
                                            className={`mx-auto flex items-center justify-center rounded-md font-jakarta transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:text-slate-300 ${compact ? 'size-7 text-[11px] sm:size-8 sm:text-xs md:size-7 md:text-[11px]' : 'size-8 text-xs sm:size-9 sm:text-sm'} ${
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

                <div className={`flex flex-wrap border-b border-[#d7e6ff] text-slate-600 ${compact ? 'mt-2 gap-x-2 gap-y-0.5 pb-2 text-[10px] sm:text-[11px] md:text-[10px]' : 'mt-3 gap-x-3 gap-y-1 pb-3 text-xs sm:text-sm'}`}>
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
                className={`grid ${compact ? 'mt-2 grid-cols-2 gap-2' : 'mt-3 grid-cols-1 gap-3 sm:grid-cols-2'}`}
            >
                <div>
                    <label htmlFor={checkInDateId} className={`booking-field-label ${compact ? 'text-[11px] sm:text-xs md:text-[11px]' : ''}`}>
                        Check-in date
                    </label>
                    <input
                        id={checkInDateId}
                        type="date"
                        min={minDate}
                        aria-invalid={Boolean(
                            fields.checkInDate &&
                                isUnavailable(fields.checkInDate),
                        )}
                        value={fields.checkInDate}
                        onChange={(event) =>
                            updateFields({ checkInDate: event.target.value })
                        }
                        className={`booking-input ${compact ? 'min-h-9 px-2 py-1 text-base sm:text-sm md:text-xs' : ''}`}
                    />
                </div>
                <div>
                    <label htmlFor={checkInTimeId} className={`booking-field-label ${compact ? 'text-[11px] sm:text-xs md:text-[11px]' : ''}`}>
                        Check-in time
                    </label>
                    <input
                        id={checkInTimeId}
                        type="time"
                        min={
                            fields.checkInDate === today ? nowInPht.time : undefined
                        }
                        value={fields.checkInTime || DEFAULT_CHECK_IN_TIME}
                        onChange={(event) =>
                            updateFields({
                                checkInTime:
                                    event.target.value || DEFAULT_CHECK_IN_TIME,
                            })
                        }
                        aria-describedby={timeHintId}
                        className={`booking-input ${compact ? 'min-h-9 px-2 py-1 text-base sm:text-sm md:text-xs' : ''}`}
                    />
                </div>
            </div>

            <div className={compact ? 'mt-2 border-t border-[#d7e6ff] pt-2' : 'mt-3 border-t border-[#d7e6ff] pt-3'}>
                <span id={checkoutLabelId} className={`booking-field-label ${compact ? 'text-[11px] sm:text-xs md:text-[11px]' : ''}`}>
                    Check-out (derived)
                </span>
                <div
                    aria-labelledby={checkoutLabelId}
                    className={`booking-input flex items-center font-jakarta text-slate-800 ${compact ? 'min-h-9 px-2 py-1 text-xs sm:text-sm md:text-xs' : 'min-h-11'}`}
                >
                    {stayWindow.valid
                        ? formatStayDateTime(stayWindow.checkOut)
                        : 'Not selected'}
                </div>
            </div>

            <p
                id={timeHintId}
                className={`leading-relaxed text-slate-500 ${compact ? 'mt-1.5 text-[11px] sm:text-xs md:text-[11px]' : 'mt-2 text-[13px] sm:text-sm'}`}
            >
                PHT (UTC+8) · 24-hour HH:MM in the check-in field
            </p>
            <p className={`leading-relaxed text-slate-500 ${compact ? 'mt-0.5 text-[11px] sm:text-xs md:text-[11px]' : 'mt-1 text-[13px] sm:text-sm'}`}>
                {PAID_DAY_HINT}
            </p>

            {message ? (
                <p role="status" className={`leading-relaxed text-rose-600 ${compact ? 'mt-2 text-[11px] sm:text-xs md:text-[11px]' : 'mt-3 text-[13px] sm:text-sm'}`}>
                    {message}
                </p>
            ) : (
                <p className={`rounded-lg bg-white/70 font-jakarta leading-relaxed text-slate-600 ${compact ? 'mt-2 px-2 py-1.5 text-[11px] sm:text-xs md:text-[11px]' : 'mt-3 px-3 py-2 text-[13px] sm:text-sm'}`}>
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
