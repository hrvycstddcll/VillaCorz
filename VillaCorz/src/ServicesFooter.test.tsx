import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ServicesFooter from './assets/components/ui/InteractiveComponents/ServicesFooter'
import { fieldsFromStay, phtDateTimeToIso } from './lib/stayDateTime'

const fields = fieldsFromStay(
    phtDateTimeToIso('2026-12-01', '10:00'),
    phtDateTimeToIso('2026-12-03', '08:00'),
    2,
)

const renderFooter = (
    hasSelectedRooms: boolean,
    onBrowseRooms = vi.fn(),
    datesEnabled = hasSelectedRooms,
) => {
    render(
        <ServicesFooter
            fields={fields}
            hasSelectedRooms={hasSelectedRooms}
            datesEnabled={datesEnabled}
            onChange={vi.fn()}
            checkIn={fields.checkInDate}
            checkOut="2026-12-03T00:00:00.000Z"
            paidDays={2}
            roomGuests={[
                {
                    stayId: hasSelectedRooms ? '1' : null,
                    adults: 2,
                    kids: 0,
                },
            ]}
            setRoomGuests={vi.fn()}
            roomChoices={[{ id: '1', title: 'Ocean Room', category: 'public' }]}
            notice=""
            onCheckAvailability={vi.fn()}
            onBrowseRooms={onBrowseRooms}
        />,
    )
    return { onBrowseRooms }
}

describe('ServicesFooter', () => {
    it('shows the choosing mascot instead of dates before a room is selected', () => {
        const { onBrowseRooms } = renderFooter(false)

        fireEvent.click(screen.getByRole('button', { name: 'Choose a room first' }))

        expect(
            screen.getByRole('heading', { name: 'Choose a room first' }),
        ).toBeInTheDocument()
        expect(screen.queryByLabelText('Check-in date')).toBeNull()

        fireEvent.click(screen.getByRole('button', { name: 'Browse rooms' }))
        expect(onBrowseRooms).toHaveBeenCalledTimes(1)
    })

    it('shows the date picker after a room is selected', () => {
        renderFooter(true)

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Choose check-in date, time, and paid days',
            }),
        )

        expect(screen.getByLabelText('Check-in date')).toBeInTheDocument()
    })

    it('shows the date picker when dates are enabled without a room', () => {
        renderFooter(false, vi.fn(), true)

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Choose check-in date, time, and paid days',
            }),
        )

        expect(screen.getByLabelText('Check-in date')).toBeInTheDocument()
        expect(
            screen.queryByRole('heading', { name: 'Choose a room first' }),
        ).toBeNull()
    })
})
