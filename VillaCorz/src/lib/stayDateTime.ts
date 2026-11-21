export type StayDateFields = {
    checkInDate: string
    checkInTime: string
    paidDays: number
}

export type StayWindow = {
    checkIn: string
    checkOut: string
    paidDays: number
    nights: number
    valid: boolean
    error: string
}

export const DEFAULT_CHECK_IN_TIME = '10:00'
export const DEFAULT_CHECK_OUT_TIME = '08:00'

export const PAID_DAY_HOURS = 24
export const OCCUPANCY_HOURS = 22
export const TURNOVER_HOURS = 2

export const MIN_PAID_DAYS = 1
export const MAX_PAID_DAYS = 90

export const PAID_DAY_HINT =
    'Each paid day is 22 hours · same check-in time · 2h turnover'

export const emptyStayFields: StayDateFields = {
    checkInDate: '',
    checkInTime: DEFAULT_CHECK_IN_TIME,
    paidDays: MIN_PAID_DAYS,
}

const PHT_OFFSET_MS = 8 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = PAID_DAY_HOURS * HOUR_MS

export const phtToday = () =>
    new Date(Date.now() + PHT_OFFSET_MS).toISOString().slice(0, 10)

export const splitPhtDateTime = (iso: string): { date: string; time: string } => {
    if (!iso) return { date: '', time: '' }
    const parsed = new Date(iso)
    if (!Number.isFinite(parsed.getTime())) return { date: '', time: '' }
    const shifted = new Date(parsed.getTime() + PHT_OFFSET_MS).toISOString()
    return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) }
}

export const phtDateTimeToIso = (date: string, time: string) => {
    if (!date || !time) return ''
    const parsed = Date.parse(`${date}T${time}:00+08:00`)
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : ''
}

export const addPhtDays = (date: string, amount: number) => {
    const parsed = Date.parse(`${date}T00:00:00Z`)
    if (!date || !Number.isFinite(parsed)) return ''
    return new Date(parsed + amount * DAY_MS).toISOString().slice(0, 10)
}

export const normalizePaidDays = (value: unknown) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return MIN_PAID_DAYS
    return Math.min(
        MAX_PAID_DAYS,
        Math.max(MIN_PAID_DAYS, Math.floor(parsed)),
    )
}

export const formatPaidDays = (paidDays: number) =>
    `${paidDays} paid day${paidDays === 1 ? '' : 's'}`

export const paidDaysFromCheckoutDate = (
    checkInDate: string,
    checkInTime: string,
    checkOutDate: string,
) => {
    if (!checkInDate || !checkOutDate) return MIN_PAID_DAYS

    const startDay = Date.parse(`${checkInDate}T00:00:00Z`)
    const endDay = Date.parse(`${checkOutDate}T00:00:00Z`)

    if (!Number.isFinite(startDay) || !Number.isFinite(endDay)) {
        return MIN_PAID_DAYS
    }

    const time = checkInTime || DEFAULT_CHECK_IN_TIME
    const [hours, minutes] = time.split(':').map(Number)

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return MIN_PAID_DAYS
    }

    const dayDifference = Math.round((endDay - startDay) / DAY_MS)
    const checkoutFallsOnPreviousDay =
        hours * 60 + minutes < TURNOVER_HOURS * 60

    return dayDifference + (checkoutFallsOnPreviousDay ? 1 : 0)
}

export const paidDayStartDates = (
    fields: Pick<StayDateFields, 'checkInDate' | 'checkInTime'>,
    paidDays: number,
) => {
    if (!fields.checkInDate) return []

    const count = normalizePaidDays(paidDays)

    return Array.from({ length: count }, (_, index) =>
        addPhtDays(fields.checkInDate, index),
    )
}

export const paidDaysFromStay = (checkIn: string, checkOut: string) => {
    const start = Date.parse(checkIn)
    const end = Date.parse(checkOut)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return MIN_PAID_DAYS
    }

    const elapsedPaidDays = (end - start + TURNOVER_HOURS * HOUR_MS) / DAY_MS
    return normalizePaidDays(Math.round(elapsedPaidDays))
}

export const fieldsFromStay = (
    checkIn: string,
    checkOut: string,
    paidDays?: number | null,
): StayDateFields => {
    const start = splitPhtDateTime(checkIn)
    const hasPaidDays =
        paidDays != null &&
        Number.isFinite(Number(paidDays)) &&
        Number(paidDays) >= MIN_PAID_DAYS

    return {
        checkInDate: start.date,
        checkInTime: start.time || DEFAULT_CHECK_IN_TIME,
        paidDays: hasPaidDays
            ? normalizePaidDays(paidDays)
            : paidDaysFromStay(checkIn, checkOut),
    }
}

export const checkoutIsoFor = (
    fields: Pick<StayDateFields, 'checkInDate' | 'checkInTime'>,
    paidDays: number,
) => {
    const checkIn = phtDateTimeToIso(
        fields.checkInDate,
        fields.checkInTime || DEFAULT_CHECK_IN_TIME,
    )
    if (!checkIn) return ''

    const checkoutMs =
        Date.parse(checkIn) + normalizePaidDays(paidDays) * DAY_MS - TURNOVER_HOURS * HOUR_MS
    return new Date(checkoutMs).toISOString()
}

const paidDaysError = (value: unknown) => {
    const parsed = Number(value)
    if (
        !Number.isInteger(parsed) ||
        parsed < MIN_PAID_DAYS ||
        parsed > MAX_PAID_DAYS
    ) {
        return `Choose between ${MIN_PAID_DAYS} and ${MAX_PAID_DAYS} paid days.`
    }
    return ''
}

export const getStayWindow = (
    fields: StayDateFields,
    paidDaysOverride?: number,
): StayWindow => {
    const requestedPaidDays = paidDaysOverride ?? fields.paidDays
    const checkIn = phtDateTimeToIso(
        fields.checkInDate,
        fields.checkInTime || DEFAULT_CHECK_IN_TIME,
    )
    const paidDays = normalizePaidDays(requestedPaidDays)
    const checkOut = checkoutIsoFor(fields, paidDays)

    if (!checkIn || !checkOut) {
        return {
            checkIn,
            checkOut,
            paidDays: 0,
            nights: 0,
            valid: false,
            error: 'Enter a check-in date and time.',
        }
    }

    const error = paidDaysError(requestedPaidDays)
    if (error) {
        return {
            checkIn,
            checkOut: '',
            paidDays: 0,
            nights: 0,
            valid: false,
            error,
        }
    }

    return {
        checkIn,
        checkOut,
        paidDays,
        nights: paidDays,
        valid: true,
        error: '',
    }
}

export const phtDateKey = (iso: string) => {
    const parsed = new Date(iso)
    if (!Number.isFinite(parsed.getTime())) return ''
    return new Date(parsed.getTime() + PHT_OFFSET_MS).toISOString().slice(0, 10)
}

export const formatStayDateTime = (
    iso: string,
    options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    },
) => {
    if (!iso) return 'Not selected'
    const parsed = new Date(iso)
    if (!Number.isFinite(parsed.getTime())) return 'Not selected'
    return `${new Intl.DateTimeFormat('en-PH', {
        ...options,
        timeZone: 'Asia/Manila',
    }).format(parsed)} PHT`
}
