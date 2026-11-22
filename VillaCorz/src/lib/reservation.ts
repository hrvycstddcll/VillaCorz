import {
    normalizePaidDays,
    paidDaysFromStay,
    phtDateKey,
    type StayWindow,
} from './stayDateTime'

export type ReservationStay = {
    price: number
    weekendPrice?: number
    pax?: number | null
    additionalHeadWeekdayPrice?: number
    additionalHeadWeekendPrice?: number
}

export type ReservationPrice = {
    paidDays: number
    nights: number
    total: number
    extraHeads: number
    additionalHeadTotal: number
}

type PaidDaysInput = number | string | Pick<StayWindow, 'paidDays'>

const DAY_MS = 86_400_000

const resolvePaidDays = (
    input: PaidDaysInput,
    checkIn: string,
): number => {
    if (typeof input === 'number') return normalizePaidDays(input)
    if (typeof input === 'string') return paidDaysFromStay(checkIn, input)
    return normalizePaidDays(input.paidDays)
}

export const getReservationPrice = (
    stay: ReservationStay,
    checkIn: string,
    paidDaysInput: PaidDaysInput,
    guests = 0,
): ReservationPrice => {
    const checkInMs = Date.parse(checkIn)
    const paidDays = resolvePaidDays(paidDaysInput, checkIn)

    if (!checkIn || !Number.isFinite(checkInMs)) {
        return {
            paidDays: 1,
            nights: 1,
            total: Number(stay.price) || 0,
            extraHeads: 0,
            additionalHeadTotal: 0,
        }
    }

    const pax =
        stay.pax != null && Number.isFinite(Number(stay.pax))
            ? Math.max(0, Math.floor(Number(stay.pax)))
            : null
    const extraHeads =
        pax !== null ? Math.max(0, Math.floor(guests) - pax) : 0
    const weekdayHeadPrice = Math.max(
        0,
        Number(stay.additionalHeadWeekdayPrice ?? 0),
    )
    const weekendHeadPrice = Math.max(
        0,
        Number(stay.additionalHeadWeekendPrice ?? 0),
    )
    const weekdayPrice = Math.max(0, Number(stay.price ?? 0))
    const weekendPrice = Math.max(
        0,
        Number(stay.weekendPrice ?? stay.price ?? 0),
    )

    let total = 0
    let additionalHeadTotal = 0

    for (let day = 0; day < paidDays; day += 1) {
        const windowStart = new Date(checkInMs + day * DAY_MS)
        const dayKey =
            phtDateKey(windowStart.toISOString()) ||
            windowStart.toISOString().slice(0, 10)
        const weekday = new Date(`${dayKey}T00:00:00Z`).getUTCDay()
        const isWeekend = weekday === 0 || weekday === 5 || weekday === 6
        const dayPrice = isWeekend ? weekendPrice : weekdayPrice
        const dayHeadTotal =
            extraHeads * (isWeekend ? weekendHeadPrice : weekdayHeadPrice)

        total += dayPrice + dayHeadTotal
        additionalHeadTotal += dayHeadTotal
    }

    return {
        paidDays,
        nights: paidDays,
        total,
        extraHeads,
        additionalHeadTotal,
    }
}
