import {
    fieldsFromStay,
    getStayWindow,
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

    it('uses the displayed default times when no stay is provided', () => {
        expect(fieldsFromStay('', '')).toEqual({
            checkInDate: '',
            checkInTime: '14:00',
            checkOutDate: '',
            checkOutTime: '12:00',
        })
    })

    it('allows a same-day stay and counts it as one night', () => {
        const window = getStayWindow({
            checkInDate: '2026-11-20',
            checkInTime: '08:00',
            checkOutDate: '2026-11-20',
            checkOutTime: '22:00',
        })

        expect(window.valid).toBe(true)
        expect(window.nights).toBe(1)
    })

    it('rejects a check-out that is not later than check-in', () => {
        const window = getStayWindow({
            checkInDate: '2026-11-20',
            checkInTime: '14:00',
            checkOutDate: '2026-11-20',
            checkOutTime: '14:00',
        })

        expect(window.valid).toBe(false)
        expect(window.error).toBe('Check-out must be later than check-in.')
    })

    it('round-trips ISO instants into form fields', () => {
        expect(
            fieldsFromStay(
                '2026-11-20T00:00:00.000Z',
                '2026-11-22T14:30:00.000Z',
            ),
        ).toEqual({
            checkInDate: '2026-11-20',
            checkInTime: '08:00',
            checkOutDate: '2026-11-22',
            checkOutTime: '22:30',
        })
    })
})
