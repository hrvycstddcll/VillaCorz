import {
    fieldsFromStay,
    formatPaidDays,
    getStayWindow,
    paidDayStartDates,
    paidDaysFromCheckoutDate,
    paidDaysFromStay,
    phtDateKey,
    phtDateTimeToIso,
    splitPhtDateTime,
} from './stayDateTime'

describe('stayDateTime', () => {
    it('converts Philippine local date and time to a UTC ISO instant', () => {
        expect(phtDateTimeToIso('2026-11-20', '08:00')).toBe(
            '2026-11-20T00:00:00.000Z',
        )
        expect(phtDateTimeToIso('2026-11-20', '22:30')).toBe(
            '2026-11-20T14:30:00.000Z',
        )
    })

    it('splits an ISO instant back into Philippine date and time fields', () => {
        expect(splitPhtDateTime('2026-11-20T14:30:00.000Z')).toEqual({
            date: '2026-11-20',
            time: '22:30',
        })
    })

    it('uses the displayed default times and one paid day when no stay is provided', () => {
        expect(fieldsFromStay('', '')).toEqual({
            checkInDate: '',
            checkInTime: '10:00',
            paidDays: 1,
        })
    })

    it('derives checkout from one paid day and keeps nights as a compatibility alias', () => {
        const window = getStayWindow({
            checkInDate: '2026-11-20',
            checkInTime: '08:00',
            paidDays: 1,
        })

        expect(window.valid).toBe(true)
        expect(window.checkIn).toBe('2026-11-20T00:00:00.000Z')
        expect(window.checkOut).toBe('2026-11-20T22:00:00.000Z')
        expect(window.paidDays).toBe(1)
        expect(window.nights).toBe(1)
    })

    it('rejects paid days outside the supported range', () => {
        const window = getStayWindow({
            checkInDate: '2026-11-20',
            checkInTime: '10:00',
            paidDays: 0,
        })

        expect(window.valid).toBe(false)
        expect(window.error).toBe('Choose between 1 and 90 paid days.')
    })

    it('round-trips ISO instants into arrival fields and paid days', () => {
        expect(
            fieldsFromStay(
                '2026-11-20T00:00:00.000Z',
                '2026-11-21T22:00:00.000Z',
            ),
        ).toEqual({
            checkInDate: '2026-11-20',
            checkInTime: '08:00',
            paidDays: 2,
        })
        expect(
            fieldsFromStay(
                '2026-11-20T00:00:00.000Z',
                '2026-11-20T00:00:00.000Z',
                3,
            ),
        ).toEqual({
            checkInDate: '2026-11-20',
            checkInTime: '08:00',
            paidDays: 3,
        })
    })

    it('formats paid-day labels and derives paid days from checkout instants', () => {
        expect(formatPaidDays(1)).toBe('1 paid day')
        expect(formatPaidDays(2)).toBe('2 paid days')
        expect(
            paidDaysFromStay(
                '2026-11-20T00:00:00.000Z',
                '2026-11-21T22:00:00.000Z',
            ),
        ).toBe(2)
    })

    it('derives paid days from a selected checkout date', () => {
        expect(
            paidDaysFromCheckoutDate('2026-11-20', '10:00', '2026-11-22'),
        ).toBe(2)
        expect(
            paidDaysFromCheckoutDate('2026-11-20', '01:00', '2026-11-21'),
        ).toBe(2)
        expect(
            paidDaysFromCheckoutDate('2026-11-20', '23:00', '2026-11-21'),
        ).toBe(1)
        expect(
            paidDaysFromCheckoutDate('2026-11-20', '10:00', '2026-11-20'),
        ).toBe(0)
    })

    it('lists paid-day start dates across the selected range', () => {
        const fields = { checkInDate: '2026-11-20', checkInTime: '10:00' }

        expect(paidDayStartDates(fields, 3)).toEqual([
            '2026-11-20',
            '2026-11-21',
            '2026-11-22',
        ])

        const window = getStayWindow({ ...fields, paidDays: 3 })
        expect(phtDateKey(window.checkOut)).toBe('2026-11-23')
    })
})
