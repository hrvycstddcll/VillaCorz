import { useState } from 'react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import BookingCalendarPanel from './assets/components/ui/InteractiveComponents/BookingCalendarPanel'

const Harness = () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <BookingCalendarPanel
            checkIn="2026-11-20"
            checkOut="2026-11-22"
            setCheckIn={vi.fn()}
            setCheckOut={vi.fn()}
            roomGuests={[{ stayId: '1', adults: 2, kids: 0 }]}
            setRoomGuests={vi.fn()}
            selectedRoomIndex={0}
            onSelectedRoomIndexChange={vi.fn()}
            roomChoices={[
                { id: '1', title: 'Ocean Room', category: 'public' },
            ]}
            notice=""
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            onDateChange={vi.fn()}
            onCheckAvailability={vi.fn()}
        />
    )
}

const renderPanel = () => render(<Harness />)

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
    it('keeps the compact summary visible and no drawer before opening', () => {
        renderPanel()

        const editButton = screen.getByRole('button', { name: 'Edit booking' })

        expect(
            screen.getAllByRole('button', { name: 'Edit booking' }),
        ).toHaveLength(1)
        expect(editButton).toHaveAttribute('aria-expanded', 'false')
        expect(editButton).toHaveAttribute('aria-controls', 'booking-drawer')
        expect(
            screen.getByText('20 Fri Nov – 22 Sun Nov · 2 nights · 2 guests · 1 room'),
        ).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
        expect(
            screen.queryByRole('heading', { name: 'November 2026' }),
        ).toBeNull()
        expect(
            screen.queryByRole('combobox', { name: 'Room 1 / selected room' }),
        ).toBeNull()
    })

    it('slides in a whole form drawer with both sections visible and no accordion', async () => {
        renderPanel()

        const drawer = await openDrawer()

        expect(drawer).toHaveFocus()
        expect(document.querySelector('aside')).toHaveAttribute('inert')
        expect(within(drawer).getByRole('heading', { name: 'Dates' })).toBeInTheDocument()
        expect(
            within(drawer).getByRole('heading', { name: 'Rooms & guests' }),
        ).toBeInTheDocument()
        expect(
            within(drawer).getByRole('heading', { name: 'November 2026' }),
        ).toBeInTheDocument()
        expect(
            within(drawer).getByRole('combobox', {
                name: 'Room 1 / selected room',
            }),
        ).toBeInTheDocument()
        expect(
            within(drawer).getAllByRole('button', { name: 'Continue' }),
        ).toHaveLength(1)
        expect(screen.queryByRole('button', { name: /^Dates/ })).toBeNull()
        expect(screen.queryByRole('button', { name: /^Rooms & guests/ })).toBeNull()
    })

    it('closes with the drawer Close button and restores focus to Edit booking', async () => {
        renderPanel()

        const drawer = await openDrawer()

        fireEvent.click(within(drawer).getByRole('button', { name: 'Close booking form' }))

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Edit booking' })).toHaveFocus(),
        )
        expect(
            screen.queryByRole('combobox', { name: 'Room 1 / selected room' }),
        ).toBeNull()
    })

    it('closes on Escape and restores focus to Edit booking', async () => {
        renderPanel()

        await openDrawer()

        fireEvent.keyDown(document, { key: 'Escape' })

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Edit booking' })).toHaveFocus(),
        )
    })

    it('closes when the backdrop is clicked', async () => {
        renderPanel()

        await openDrawer()

        const backdrop = document.querySelector('.booking-backdrop-enter')
        expect(backdrop).not.toBeNull()
        fireEvent.click(backdrop as Element)

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    })
})
