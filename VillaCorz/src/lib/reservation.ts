export type ReservationStay = {
    price: number
    weekendPrice?: number
}

export const getReservationPrice = (
    stay: ReservationStay,
    checkIn: string,
    checkOut: string,
): { nights: number; total: number } => {
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
        return { nights: 1, total: stay.price }
    }

    let total = 0
    let nights = 0

    for (let time = startTime; time < endTime; time += 86_400_000) {
        const day = new Date(time).getUTCDay()
        const isWeekend = day === 0 || day === 5 || day === 6
        total += isWeekend ? stay.weekendPrice ?? stay.price : stay.price
        nights += 1
    }

    return { nights, total }
}