import { useState } from 'react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import BookingCalendarPanel from '../assets/components/ui/InteractiveComponents/BookingCalendarPanel'
import {
    fieldsFromStay,
    phtDateTimeToIso,
    type StayDateFields,
} from '../lib/stayDateTime'
import type { RoomGuests } from '../assets/components/ui/InteractiveComponents/ServicesFooter'

const onCheckAvailability = vi.fn()

const dayLabel = (value: string) =>
    new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'full',
        timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`))

const clickDrawerDate = (
    drawer: HTMLElement,
    value: string,
) => {
    let button = within(drawer).queryByRole('button', { name: dayLabel(value) })
    if (!button) {
        fireEvent.click(
            within(drawer).getByRole('button', { name: 'Next month' }),
        )
        button = within(drawer).getByRole('button', { name: dayLabel(value) })
    }
    fireEvent.click(button)
}

const initialFields: StayDateFields = fieldsFromStay(
    phtDateTimeToIso('2026-12-01', '10:00'),
    phtDateTimeToIso('2026-12-03', '08:00'),
    2,
)

const Harness = ({
    hasSelectedRooms = true,
    notice = '',
    noticeTone = 'error',
    unavailableRoomIds = [],
    unavailableDates = [],
    blockedReason = '',
}: {
    hasSelectedRooms?: boolean
    notice?: string
    noticeTone?: 'success' | 'error'
    unavailableRoomIds?: string[]
    unavailableDates?: string[]
    blockedReason?: string
} = {}) => {
    const [fields, setFields] = useState(initialFields)
    const [roomGuests, setRoomGuests] = useState<RoomGuests[]>([
        { stayId: hasSelectedRooms ? '1' : null, adults: 2, kids: 0 },
    ])
    const [isOpen, setIsOpen] = useState(false)
    const selectedRoomIds = roomGuests.flatMap((room) =>
        room.stayId ? [room.stayId] : [],
    )

    return (
        <BookingCalendarPanel
            fields={fields}
            hasSelectedRooms={selectedRoomIds.length > 0}
            onChange={(patch) =>
                setFields((current) => ({ ...current, ...patch }))
            }
            roomGuests={roomGuests}
            setRoomGuests={setRoomGuests}
            roomChoices={[{ id: '1', title: 'Ocean Room', category: 'public' }]}
            notice={notice}
            noticeTone={noticeTone}
            unavailableRoomIds={unavailableRoomIds}
            unavailableDates={unavailableDates}
            blockedReason={blockedReason}
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            onCheckAvailability={onCheckAvailability}
        />
    )
}

const openDrawer = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Edit booking' }))
    return screen.findByRole('dialog', { name: 'Your booking' })
}

beforeAll(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterAll(() => {
    vi.restoreAllMocks()
})

describe('BookingCalendarPanel', () => {
    it('shows the booking summary and no drawer before opening', () => {
        render(<Harness />)

        const editButton = screen.getByRole('button', { name: 'Edit booking' })
        expect(editButton).toHaveAttribute('aria-expanded', 'false')
        expect(editButton).toHaveAttribute('aria-controls', 'booking-drawer')
        expect(screen.getByText(/Your booking/)).toBeInTheDocument()
        expect(screen.getByText(/2 paid days/)).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
    })

    it('replaces the calendar with the choosing mascot until a room is selected', async () => {
        render(<Harness hasSelectedRooms={false} />)

        const drawer = await openDrawer()

        expect(within(drawer).getByText('Step 1 of 2 · Choose a room')).toBeInTheDocument()
        expect(
            within(drawer).getByRole('heading', { name: 'Choose a room first' }),
        ).toBeInTheDocument()
        expect(within(drawer).queryByLabelText('Check-in date')).toBeNull()
        expect(
            within(drawer).getByRole('button', { name: 'Choose a room first' }),
        ).toBeDisabled()

        fireEvent.click(within(drawer).getByRole('button', { name: 'Choose a room' }))
        expect(within(drawer).getByRole('combobox', { name: 'Room 1' })).toHaveFocus()

        fireEvent.change(within(drawer).getByRole('combobox', { name: 'Room 1' }), {
            target: { value: '1' },
        })
        expect(within(drawer).getByText('Step 2 of 2 · Pick dates')).toBeInTheDocument()
        expect(within(drawer).getByLabelText('Check-in date')).toBeInTheDocument()
    })

    it('opens the modal with dates and the added room ready to edit', async () => {
        render(<Harness />)

        const drawer = await openDrawer()

        expect(drawer).toHaveFocus()
        expect(document.querySelector('aside')).toHaveAttribute('inert')
        expect(
            within(drawer).getByRole('heading', { name: 'Dates & paid days' }),
        ).toBeInTheDocument()
        expect(
            within(drawer).getByRole('heading', { name: 'Rooms & guests' }),
        ).toBeInTheDocument()
        expect(within(drawer).getByLabelText('Check-in date')).toHaveValue('2026-12-01')
        expect(within(drawer).getByLabelText('Check-in time')).toHaveValue('10:00')
        expect(within(drawer).getByText('Select check-in date')).toBeInTheDocument()
        expect(within(drawer).getByText('Check-out (derived)')).toBeInTheDocument()
        expect(within(drawer).queryByLabelText('Number of paid days')).toBeNull()
        expect(
            within(drawer).queryByRole('button', { name: /paid days/i }),
        ).toBeNull()
        expect(within(drawer).queryByLabelText('Check-out date')).toBeNull()
        expect(within(drawer).getByRole('combobox', { name: 'Room 1' })).toHaveValue('1')
        expect(within(drawer).getByText('Added · Ocean Room')).toBeInTheDocument()
        expect(
            within(drawer).queryByRole('button', { name: 'Deselect room 1' }),
        ).toBeNull()
    })

    it('removes the room input when the added room is cleared', async () => {
        render(<Harness />)

        const drawer = await openDrawer()
        fireEvent.change(
            within(drawer).getByRole('combobox', { name: 'Room 1' }),
            { target: { value: '' } },
        )

        expect(
            within(drawer).queryByRole('combobox', { name: 'Room 1' }),
        ).toBeNull()
        expect(within(drawer).queryByText('Not added')).toBeNull()
        expect(
            within(drawer).getByRole('button', { name: '+ Add room' }),
        ).toBeInTheDocument()
    })

    it('shows the PHT format hint inside the modal without preset buttons', async () => {
        render(<Harness />)

        const drawer = await openDrawer()

        expect(
            within(drawer).getByText(
                'PHT (UTC+8) · 24-hour HH:MM in the check-in field',
            ),
        ).toBeInTheDocument()
        expect(within(drawer).queryByRole('button', { name: /preset/i })).toBeNull()
    })

    it('changes paid days from the calendar by choosing a check-out date', async () => {
        render(<Harness />)

        const drawer = await openDrawer()
        clickDrawerDate(drawer, '2026-12-01')
        expect(
            within(drawer).getByText('Select check-out date'),
        ).toBeInTheDocument()

        clickDrawerDate(drawer, '2026-12-04')

        expect(
            within(drawer).getByText('Select check-in date'),
        ).toBeInTheDocument()
        expect(within(drawer).getAllByText(/3 paid days/).length).toBeGreaterThan(0)
    })

    it('continues the reservation from the modal', async () => {
        onCheckAvailability.mockClear()
        render(<Harness />)

        const drawer = await openDrawer()
        fireEvent.click(within(drawer).getByRole('button', { name: 'Continue' }))

        expect(onCheckAvailability).toHaveBeenCalledTimes(1)
    })

    it('closes with the Close button and restores focus to Edit booking', async () => {
        render(<Harness />)

        const drawer = await openDrawer()
        fireEvent.click(within(drawer).getByRole('button', { name: 'Close booking form' }))

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Edit booking' })).toHaveFocus(),
        )
    })

    it('closes on Escape', async () => {
        render(<Harness />)

        await openDrawer()
        fireEvent.keyDown(document, { key: 'Escape' })

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    })

    it('blocks Continue and marks unavailable rooms when availability changed', async () => {
        onCheckAvailability.mockClear()
        render(
            <Harness
                unavailableRoomIds={['1']}
                blockedReason="Ocean Room already booked for these dates."
            />,
        )

        const drawer = await openDrawer()

        expect(within(drawer).getByRole('alert')).toHaveTextContent(
            'Ocean Room already booked for these dates.',
        )
        expect(
            within(drawer).getByRole('combobox', { name: 'Room 1' }),
        ).not.toHaveAttribute('aria-invalid')
        expect(
            within(drawer).getByRole('button', { name: 'Unavailable' }),
        ).toBeDisabled()
        expect(
            within(drawer).getByRole('option', { name: 'Ocean Room (unavailable)' }),
        ).toBeInTheDocument()

        fireEvent.click(
            within(drawer).getByRole('button', { name: 'Unavailable' }),
        )
        expect(onCheckAvailability).not.toHaveBeenCalled()
    })

    it('shows add-room notices in blue instead of red', async () => {
        render(
            <Harness
                notice="Room 5 added to your booking."
                noticeTone="success"
            />,
        )

        const drawer = await openDrawer()
        const status = within(drawer).getByText('Room 5 added to your booking.')

        expect(status).toHaveTextContent('Room 5 added to your booking.')
        expect(status).toHaveClass('text-blue-800')
    })
})
