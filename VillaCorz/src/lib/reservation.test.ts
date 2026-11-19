import { getReservationPrice } from './reservation'

const stay = {
    price: 1000,
    weekendPrice: 1500,
    pax: 2,
    additionalHeadWeekdayPrice: 50,
    additionalHeadWeekendPrice: 100,
}

describe('getReservationPrice', () => {
    it('adds the weekday additional-head fee for each extra guest', () => {
        const result = getReservationPrice(
            stay,
            '2026-11-16',
            '2026-11-18',
            3,
        )

        expect(result.nights).toBe(2)
        expect(result.extraHeads).toBe(1)
        expect(result.additionalHeadTotal).toBe(100)
        expect(result.total).toBe(2100)
    })

    it('adds the weekend additional-head fee for each extra guest', () => {
        const result = getReservationPrice(
            stay,
            '2026-11-13',
            '2026-11-15',
            4,
        )

        expect(result.nights).toBe(2)
        expect(result.extraHeads).toBe(2)
        expect(result.additionalHeadTotal).toBe(400)
        expect(result.total).toBe(3400)
    })

    it('charges weekday and weekend head rates across a mixed stay', () => {
        const result = getReservationPrice(
            stay,
            '2026-11-12',
            '2026-11-16',
            3,
        )

        expect(result.nights).toBe(4)
        expect(result.additionalHeadTotal).toBe(350)
        expect(result.total).toBe(5850)
    })

    it('does not charge a head fee at or below pax', () => {
        const result = getReservationPrice(
            stay,
            '2026-11-16',
            '2026-11-18',
            2,
        )

        expect(result.extraHeads).toBe(0)
        expect(result.additionalHeadTotal).toBe(0)
        expect(result.total).toBe(2000)
    })

    it('does not charge a head fee when pax is not set', () => {
        const result = getReservationPrice(
            { ...stay, pax: null },
            '2026-11-16',
            '2026-11-18',
            6,
        )

        expect(result.extraHeads).toBe(0)
        expect(result.total).toBe(2000)
    })

    it('keeps the head fee separate from discounted room prices', () => {
        const result = getReservationPrice(
            { ...stay, price: 900 },
            '2026-11-16',
            '2026-11-18',
            3,
        )

        expect(result.total).toBe(1900)
        expect(result.additionalHeadTotal).toBe(100)
    })
})
