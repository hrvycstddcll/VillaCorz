import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import HomeAvailabilityPanel, {
    type HomeAvailabilityPanelProps,
} from '../assets/components/ui/InteractiveComponents/HomeAvailabilityPanel'
import { phtDateTimeToIso } from '../lib/stayDateTime'
import type { Stay } from '../services/shared'

const makeStay = (
    id: string,
    title: string,
    category: Stay['category'] = 'public',
): Stay => ({
    id,
    title,
    category,
    image: '',
    gallery: [],
    price: 1000,
    description: '',
    amenities: [],
    capacity: 'Good for 2-4 pax',
})

const room = makeStay('1', 'Ocean Room')
const villa = makeStay('3', 'Whole Villa', 'exclusive')
const choices = [room, makeStay('2', 'Family Suite'), villa]

const baseProps: HomeAvailabilityPanelProps = {
    checkIn: phtDateTimeToIso('2026-12-01', '10:00'),
    paidDays: 2,
    choices,
    availabilityByServiceId: { 1: true, 2: false, 3: true },
    selectedRoomIds: [],
    selectedStays: [],
    checkingAvailability: false,
    availabilityError: '',
    roomsLoading: false,
    roomsError: '',
    onToggleRoom: vi.fn(),
}

const renderPanel = (overrides: Partial<HomeAvailabilityPanelProps> = {}) => {
    const props = { ...baseProps, ...overrides }
    return { props, ...render(<HomeAvailabilityPanel {...props} />) }
}

describe('HomeAvailabilityPanel', () => {
    it('shows only available rooms and adds one', () => {
        const onToggleRoom = vi.fn()
        renderPanel({ onToggleRoom })

        expect(screen.getAllByText(/Available$/).length).toBeGreaterThan(0)
        expect(screen.queryByText(/Unavailable$/)).toBeNull()
        expect(screen.queryByRole('button', { name: 'Add Family Suite' })).toBeNull()

        fireEvent.click(screen.getByRole('button', { name: 'Add Ocean Room' }))
        expect(onToggleRoom).toHaveBeenCalledWith(choices[0])
    })

    it('removes a selected room', () => {
        const onToggleRoom = vi.fn()
        renderPanel({ selectedRoomIds: ['1'], onToggleRoom })

        fireEvent.click(screen.getByRole('button', { name: 'Remove Ocean Room' }))
        expect(onToggleRoom).toHaveBeenCalledWith(choices[0])
    })

    it('can hide and show the room list', () => {
        renderPanel()

        fireEvent.click(screen.getByRole('button', { name: /Hide rooms/ }))
        expect(screen.queryByText('Ocean Room')).toBeNull()

        fireEvent.click(screen.getByRole('button', { name: /Show rooms/ }))
        expect(screen.getByText('Ocean Room')).toBeInTheDocument()
    })

    it('keeps wheel scrolling inside the scrollable room list', () => {
        renderPanel()

        const list = screen.getByText('Ocean Room').closest('.overflow-y-auto')
        expect(list).toHaveAttribute('data-lenis-prevent')
    })

    it('hides the room list while availability is still checking', () => {
        renderPanel({ checkingAvailability: true })

        expect(screen.getByText('Checking live availability...')).toBeInTheDocument()
        expect(screen.getByText(/Checking availability/)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Add Ocean Room' })).toBeNull()
    })

    it('shows a no-room status when none are available for the date', () => {
        renderPanel({ availabilityByServiceId: { 1: false, 2: false } })

        expect(screen.getByText('No room available for this date')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Add / })).toBeNull()
    })

    it('keeps a selected room visible so it can be removed', () => {
        renderPanel({
            selectedRoomIds: ['2'],
            availabilityByServiceId: { 1: true, 2: false },
        })

        expect(
            screen.getByRole('button', { name: 'Remove Family Suite' }),
        ).toBeInTheDocument()
    })

    it('disables adding the whole villa while a private room is selected', () => {
        const onToggleRoom = vi.fn()
        renderPanel({
            selectedRoomIds: ['1'],
            selectedStays: [room],
            onToggleRoom,
        })

        const addVilla = screen.getByRole('button', { name: /Add Whole Villa/ })
        expect(addVilla).toBeDisabled()
        expect(screen.getByText(/Villa conflict/)).toBeInTheDocument()
        fireEvent.click(addVilla)
        expect(onToggleRoom).not.toHaveBeenCalled()
    })

    it('disables adding a private room while the whole villa is selected', () => {
        const onToggleRoom = vi.fn()
        renderPanel({
            selectedRoomIds: ['3'],
            selectedStays: [villa],
            onToggleRoom,
        })

        const addRoom = screen.getByRole('button', { name: /Add Ocean Room/ })
        expect(addRoom).toBeDisabled()
        expect(screen.getByText(/Room conflict/)).toBeInTheDocument()
        fireEvent.click(addRoom)
        expect(onToggleRoom).not.toHaveBeenCalled()
    })
})
