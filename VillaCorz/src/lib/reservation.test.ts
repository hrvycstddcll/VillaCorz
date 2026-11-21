import { getReservationPrice } from './reservation'
import { phtDateTimeToIso } from './stayDateTime'

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
            phtDateTimeToIso('2026-11-16', '08:00'),
            phtDateTimeToIso('2026-11-18', '08:00'),
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
            phtDateTimeToIso('2026-11-13', '08:00'),
            phtDateTimeToIso('2026-11-15', '08:00'),
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
            phtDateTimeToIso('2026-11-12', '08:00'),
            phtDateTimeToIso('2026-11-16', '08:00'),
            3,
        )

        expect(result.nights).toBe(4)
        expect(result.additionalHeadTotal).toBe(350)
        expect(result.total).toBe(5850)
    })

    it('does not charge a head fee at or below pax', () => {
        const result = getReservationPrice(
            stay,
            phtDateTimeToIso('2026-11-16', '08:00'),
            phtDateTimeToIso('2026-11-18', '08:00'),
            2,
        )

        expect(result.extraHeads).toBe(0)
        expect(result.additionalHeadTotal).toBe(0)
        expect(result.total).toBe(2000)
    })

    it('does not charge a head fee when pax is not set', () => {
        const result = getReservationPrice(
            { ...stay, pax: null },
            phtDateTimeToIso('2026-11-16', '08:00'),
            phtDateTimeToIso('2026-11-18', '08:00'),
            6,
        )

        expect(result.extraHeads).toBe(0)
        expect(result.total).toBe(2000)
    })

    it('keeps the head fee separate from discounted room prices', () => {
        const result = getReservationPrice(
            { ...stay, price: 900 },
            phtDateTimeToIso('2026-11-16', '08:00'),
            phtDateTimeToIso('2026-11-18', '08:00'),
            3,
        )

        expect(result.total).toBe(1900)
        expect(result.additionalHeadTotal).toBe(100)
    })

    it('charges one full night for a same-day stay', () => {
        const result = getReservationPrice(
            stay,
            phtDateTimeToIso('2026-11-16', '08:00'),
            phtDateTimeToIso('2026-11-16', '22:00'),
            2,
        )

        expect(result.nights).toBe(1)
        expect(result.total).toBe(1000)
    })

    it('classifies nights by Philippine date even when UTC differs', () => {
        const result = getReservationPrice(
            stay,
            phtDateTimeToIso('2026-11-13', '22:00'),
            phtDateTimeToIso('2026-11-15', '08:00'),
            2,
        )

        expect(result.nights).toBe(2)
        expect(result.total).toBe(3000)
    })
})
