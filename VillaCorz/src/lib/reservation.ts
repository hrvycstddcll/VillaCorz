import { phtDateKey } from './stayDateTime'

export type ReservationStay = {
    price: number
    weekendPrice?: number
    pax?: number | null
    additionalHeadWeekdayPrice?: number
    additionalHeadWeekendPrice?: number
}

const DAY_MS = 86_400_000

export const getReservationPrice = (
    stay: ReservationStay,
    checkIn: string,
    checkOut: string,
    guests = 0,
): {
    nights: number
    total: number
    extraHeads: number
    additionalHeadTotal: number
} => {
    const checkInMs = Date.parse(checkIn)
    const checkOutMs = Date.parse(checkOut)
    const startKey = phtDateKey(checkIn)
    const endKey = phtDateKey(checkOut)
    const startDateMs = Date.parse(`${startKey}T00:00:00Z`)
    const endDateMs = Date.parse(`${endKey}T00:00:00Z`)

    if (
        !checkIn ||
        !checkOut ||
        !Number.isFinite(checkInMs) ||
        !Number.isFinite(checkOutMs) ||
        !Number.isFinite(startDateMs) ||
        !Number.isFinite(endDateMs) ||
        checkOutMs <= checkInMs
    ) {
        return {
            nights: 1,
            total: stay.price,
            extraHeads: 0,
            additionalHeadTotal: 0,
        }
    }

    const nights = Math.max(
        1,
        Math.round((endDateMs - startDateMs) / DAY_MS),
    )
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

    let total = 0
    let additionalHeadTotal = 0
    const billableEnd = startDateMs + nights * DAY_MS

    for (let time = startDateMs; time < billableEnd; time += DAY_MS) {
        const dayKey = new Date(time).toISOString().slice(0, 10)
        const weekday = new Date(`${dayKey}T00:00:00Z`).getUTCDay()
        const isWeekend = weekday === 0 || weekday === 5 || weekday === 6
        const nightlyTotal = isWeekend
            ? (stay.weekendPrice ?? stay.price)
            : stay.price
        const nightlyHeadTotal =
            extraHeads * (isWeekend ? weekendHeadPrice : weekdayHeadPrice)

        total += nightlyTotal + nightlyHeadTotal
        additionalHeadTotal += nightlyHeadTotal
    }

    return { nights, total, extraHeads, additionalHeadTotal }
}
