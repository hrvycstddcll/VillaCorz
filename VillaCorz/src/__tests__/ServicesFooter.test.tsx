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
    const onCheckAvailability = vi.fn()
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
            onCheckAvailability={onCheckAvailability}
            onBrowseRooms={onBrowseRooms}
        />,
    )
    return { onBrowseRooms, onCheckAvailability }
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

    it('expands the compact form before checking availability on small screens', () => {
        const { onCheckAvailability } = renderFooter(true)

        expect(
            screen.getByRole('button', { name: 'Expand booking form' }),
        ).toHaveClass('md:hidden')

        fireEvent.click(screen.getByRole('button', { name: 'Check availability' }))

        expect(
            screen.getByRole('button', { name: 'Collapse booking form' }),
        ).toHaveAttribute('aria-expanded', 'true')
        expect(onCheckAvailability).not.toHaveBeenCalled()

        fireEvent.click(screen.getByRole('button', { name: 'Check availability' }))
        expect(onCheckAvailability).toHaveBeenCalledTimes(1)
    })

    it('moves focus into an open popover and restores it with Escape', () => {
        renderFooter(true)
        const trigger = screen.getByRole('button', {
            name: 'Choose check-in date, time, and paid days',
        })

        fireEvent.click(trigger)

        const dialog = screen.getByRole('dialog', {
            name: 'Choose your stay date and time',
        })
        expect(dialog).toHaveClass('left-1/2', '-translate-x-1/2')
        expect(dialog).toHaveFocus()

        fireEvent.keyDown(document, { key: 'Tab' })
        expect(dialog.contains(document.activeElement)).toBe(true)
        expect(dialog).not.toHaveFocus()

        fireEvent.keyDown(document, { key: 'Escape' })
        expect(
            screen.queryByRole('dialog', {
                name: 'Choose your stay date and time',
            }),
        ).toBeNull()
        expect(trigger).toHaveFocus()
    })

    it('restores focus to the guest trigger after closing the guest popover', () => {
        renderFooter(true)
        const trigger = screen.getByRole('button', {
            name: 'Choose rooms, adults, and children',
        })

        fireEvent.click(trigger)

        const dialog = screen.getByRole('dialog', {
            name: 'Choose rooms and guests',
        })
        expect(dialog).toHaveFocus()

        fireEvent.click(screen.getByRole('button', { name: 'Done' }))
        expect(
            screen.queryByRole('dialog', { name: 'Choose rooms and guests' }),
        ).toBeNull()
        expect(trigger).toHaveFocus()
    })

    it('sets the footer height used for scroll padding', () => {
        renderFooter(true)

        expect(
            document.documentElement.style.getPropertyValue(
                '--services-footer-height',
            ),
        ).toMatch(/px$/)
    })

    it('renders the calendar at compact footer sizing', () => {
        renderFooter(true)

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Choose check-in date, time, and paid days',
            }),
        )

        expect(
            screen.getByRole('button', { name: /December 1, 2026/ }),
        ).toHaveClass('size-7', 'text-[11px]')
    })

    it('keeps wheel scrolling inside the open popovers', () => {
        renderFooter(true)

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Choose check-in date, time, and paid days',
            }),
        )
        const dateDialog = screen.getByRole('dialog', {
            name: 'Choose your stay date and time',
        })
        expect(dateDialog).toHaveAttribute('data-lenis-prevent')
        expect(dateDialog).toHaveClass('overflow-y-auto', 'booking-scrollbar')

        fireEvent.keyDown(document, { key: 'Escape' })
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Choose rooms, adults, and children',
            }),
        )
        const guestDialog = screen.getByRole('dialog', {
            name: 'Choose rooms and guests',
        })
        expect(guestDialog).toHaveAttribute('data-lenis-prevent')
        expect(guestDialog).toHaveClass('booking-scrollbar')
    })

    it('closes the open popover when tapping outside the footer', () => {
        renderFooter(true)
        const trigger = screen.getByRole('button', {
            name: 'Choose check-in date, time, and paid days',
        })

        fireEvent.click(trigger)
        expect(
            screen.getByRole('dialog', {
                name: 'Choose your stay date and time',
            }),
        ).toBeInTheDocument()

        fireEvent.pointerDown(document.body)

        expect(
            screen.queryByRole('dialog', {
                name: 'Choose your stay date and time',
            }),
        ).toBeNull()
    })

    it('keeps the popover open when tapping inside it', () => {
        renderFooter(true)

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Choose check-in date, time, and paid days',
            }),
        )
        const dialog = screen.getByRole('dialog', {
            name: 'Choose your stay date and time',
        })

        fireEvent.pointerDown(dialog)

        expect(dialog).toBeInTheDocument()
    })
})
