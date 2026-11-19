export type ReservationStay = {
    price: number
    weekendPrice?: number
    pax?: number | null
    additionalHeadWeekdayPrice?: number
    additionalHeadWeekendPrice?: number
}

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
    const start = new Date(`${checkIn}T00:00:00Z`)
    const end = new Date(`${checkOut}T00:00:00Z`)
    const startTime = start.getTime()
    const endTime = end.getTime()

    if (
        !checkIn ||
        !checkOut ||
        !Number.isFinite(startTime) ||
        !Number.isFinite(endTime) ||
        endTime <= startTime
    ) {
        return {
            nights: 1,
            total: stay.price,
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

    let total = 0
    let nights = 0
    let additionalHeadTotal = 0

    for (let time = startTime; time < endTime; time += 86_400_000) {
        const day = new Date(time).getUTCDay()
        const isWeekend = day === 0 || day === 5 || day === 6
        const nightlyTotal = isWeekend
            ? (stay.weekendPrice ?? stay.price)
            : stay.price
        const nightlyHeadTotal =
            extraHeads * (isWeekend ? weekendHeadPrice : weekdayHeadPrice)

        total += nightlyTotal + nightlyHeadTotal
        additionalHeadTotal += nightlyHeadTotal
        nights += 1
    }

    return { nights, total, extraHeads, additionalHeadTotal }
}
