export type StayDateFields = {
    checkInDate: string
    checkInTime: string
    checkOutDate: string
    checkOutTime: string
}

export type StayWindow = {
    checkIn: string
    checkOut: string
    nights: number
    valid: boolean
    error: string
}

export const DEFAULT_CHECK_IN_TIME = '14:00'
export const DEFAULT_CHECK_OUT_TIME = '12:00'

export const emptyStayFields: StayDateFields = {
    checkInDate: '',
    checkInTime: DEFAULT_CHECK_IN_TIME,
    checkOutDate: '',
    checkOutTime: DEFAULT_CHECK_OUT_TIME,
}

const PHT_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export const phtToday = () =>
    new Date(Date.now() + PHT_OFFSET_MS).toISOString().slice(0, 10)

export const splitPhtDateTime = (iso: string): { date: string; time: string } => {
    if (!iso) return { date: '', time: '' }
    const parsed = new Date(iso)
    if (!Number.isFinite(parsed.getTime())) return { date: '', time: '' }
    const shifted = new Date(parsed.getTime() + PHT_OFFSET_MS).toISOString()
    return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) }
}

export const fieldsFromStay = (checkIn: string, checkOut: string): StayDateFields => {
    const start = splitPhtDateTime(checkIn)
    const end = splitPhtDateTime(checkOut)
    return {
        checkInDate: start.date,
        checkInTime: start.time || DEFAULT_CHECK_IN_TIME,
        checkOutDate: end.date,
        checkOutTime: end.time || DEFAULT_CHECK_OUT_TIME,
    }
}

export const phtDateTimeToIso = (date: string, time: string) => {
    if (!date || !time) return ''
    const parsed = Date.parse(`${date}T${time}:00+08:00`)
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : ''
}

export const getStayWindow = (fields: StayDateFields): StayWindow => {
    const checkIn = phtDateTimeToIso(fields.checkInDate, fields.checkInTime)
    const checkOut = phtDateTimeToIso(fields.checkOutDate, fields.checkOutTime)

    if (!checkIn || !checkOut) {
        return {
            checkIn,
            checkOut,
            nights: 0,
            valid: false,
            error: 'Enter check-in and check-out date and time.',
        }
    }

    const checkInMs = new Date(checkIn).getTime()
    const checkOutMs = new Date(checkOut).getTime()

    if (checkOutMs <= checkInMs) {
        return {
            checkIn,
            checkOut,
            nights: 0,
            valid: false,
            error: 'Check-out must be later than check-in.',
        }
    }

    const startDate = Date.parse(`${fields.checkInDate}T00:00:00Z`)
    const endDate = Date.parse(`${fields.checkOutDate}T00:00:00Z`)
    const nights = Number.isFinite(startDate) && Number.isFinite(endDate)
        ? Math.max(1, Math.round((endDate - startDate) / DAY_MS))
        : 1

    return { checkIn, checkOut, nights, valid: true, error: '' }
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
