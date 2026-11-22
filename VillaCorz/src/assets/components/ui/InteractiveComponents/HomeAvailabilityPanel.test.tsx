import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import HomeAvailabilityPanel, {
    type HomeAvailabilityPanelProps,
} from './HomeAvailabilityPanel'
import { phtDateTimeToIso } from '../../../../lib/stayDateTime'
import type { Stay } from '../../services/shared'

const makeStay = (id: string, title: string): Stay => ({
    id,
    title,
    category: 'public',
    image: '',
    gallery: [],
    price: 1000,
    description: '',
    amenities: [],
    capacity: 'Good for 2-4 pax',
})

const choices = [makeStay('1', 'Ocean Room'), makeStay('2', 'Family Suite')]

const baseProps: HomeAvailabilityPanelProps = {
    checkIn: phtDateTimeToIso('2026-12-01', '10:00'),
    paidDays: 2,
    choices,
    availabilityByServiceId: { 1: true, 2: false },
    selectedRoomIds: [],
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
    it('shows availability and adds an available room', () => {
        const onToggleRoom = vi.fn()
        renderPanel({ onToggleRoom })

        expect(screen.getByText(/Available$/)).toBeInTheDocument()
        expect(screen.getByText(/Unavailable$/)).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Add Ocean Room' }))
        expect(onToggleRoom).toHaveBeenCalledWith(choices[0])
        expect(screen.getByRole('button', { name: 'Add Family Suite' })).toBeDisabled()
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
})
