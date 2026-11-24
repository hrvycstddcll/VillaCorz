import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ServiceTile from '../assets/components/ui/InteractiveComponents/ServiceTile'

const stay = {
    id: '1',
    title: 'Ocean Room',
    image: '',
    price: 4500,
    capacity: '2 guests',
}

describe('ServiceTile', () => {
    it('makes an added room obvious and removable', () => {
        const onToggleReservation = vi.fn()

        render(
            <ServiceTile
                variant="room"
                stay={stay}
                isSelected={false}
                isReservationSelected
                selectedRoomNumber={2}
                onSelect={vi.fn()}
                onToggleReservation={onToggleReservation}
            />,
        )

        expect(screen.getByText('Added · Room 2')).toBeInTheDocument()
        const removeButton = screen.getByRole('button', {
            name: 'Remove Ocean Room from your booking',
        })
        expect(removeButton).toHaveTextContent('Remove')
        fireEvent.click(removeButton)
        expect(onToggleReservation).toHaveBeenCalledTimes(1)
    })

    it('shows a clear add action when the room is not selected', () => {
        render(
            <ServiceTile
                variant="room"
                stay={stay}
                isSelected={false}
                isReservationSelected={false}
                onSelect={vi.fn()}
                onToggleReservation={vi.fn()}
            />,
        )

        expect(
            screen.getByRole('button', {
                name: 'Add Ocean Room to your booking, good for 2 guests',
            }),
        ).toHaveTextContent('Add room')
        expect(screen.queryByText(/Added · Room/)).toBeNull()
    })

    it('disables adding an unavailable room but keeps a selected room removable', () => {
        const { rerender } = render(
            <ServiceTile
                variant="room"
                stay={stay}
                isSelected={false}
                isReservationSelected={false}
                unavailable
                onSelect={vi.fn()}
                onToggleReservation={vi.fn()}
            />,
        )

        expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0)
        expect(
            screen.getByRole('button', {
                name: 'Ocean Room is unavailable for these dates',
            }),
        ).toBeDisabled()

        const onToggleReservation = vi.fn()
        rerender(
            <ServiceTile
                variant="room"
                stay={stay}
                isSelected={false}
                isReservationSelected
                selectedRoomNumber={1}
                unavailable
                onSelect={vi.fn()}
                onToggleReservation={onToggleReservation}
            />,
        )

        const removeButton = screen.getByRole('button', {
            name: 'Remove Ocean Room from your booking',
        })
        expect(removeButton).toBeEnabled()
        fireEvent.click(removeButton)
        expect(onToggleReservation).toHaveBeenCalledTimes(1)
    })

    it('disables adding a room while the whole villa is selected', () => {
        const onToggleReservation = vi.fn()
        const message = 'Remove the whole villa before adding a private room.'
        const { rerender } = render(
            <ServiceTile
                variant="room"
                stay={stay}
                isSelected={false}
                isReservationSelected={false}
                reservationBlocked
                reservationBlockedMessage={message}
                onSelect={vi.fn()}
                onToggleReservation={onToggleReservation}
            />,
        )

        const addButton = screen.getByRole('button', {
            name: `Ocean Room cannot be added. ${message}`,
        })
        expect(addButton).toBeDisabled()
        expect(addButton).toHaveTextContent('Blocked')
        fireEvent.click(addButton)
        expect(onToggleReservation).not.toHaveBeenCalled()

        rerender(
            <ServiceTile
                variant="room"
                stay={stay}
                isSelected={false}
                isReservationSelected
                reservationBlocked
                reservationBlockedMessage={message}
                onSelect={vi.fn()}
                onToggleReservation={onToggleReservation}
            />,
        )

        const removeButton = screen.getByRole('button', {
            name: 'Remove Ocean Room from your booking',
        })
        expect(removeButton).toBeEnabled()
        fireEvent.click(removeButton)
        expect(onToggleReservation).toHaveBeenCalledTimes(1)
    })
})
