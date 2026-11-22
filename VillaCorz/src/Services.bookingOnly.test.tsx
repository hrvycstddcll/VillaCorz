import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Services from './assets/components/pages/Services'
import { getAvailabilityForRange, getBlockedDates } from './services/availabilityService'
import { getServices } from './services/serviceService'

vi.mock('./services/serviceService', () => ({
    getServices: vi.fn(),
}))

vi.mock('./services/availabilityService', () => ({
    getAvailabilityForRange: vi.fn(),
    getBlockedDates: vi.fn(),
}))

const service = {
    id: 1,
    created_by: null,
    kind: 'room',
    name: 'Ocean Room',
    description: null,
    price: '5000.00',
    weekend_price: null,
    additional_head_weekday_price: null,
    additional_head_weekend_price: null,
    weekday_discount_type: null,
    weekday_discount_value: null,
    weekend_discount_type: null,
    weekend_discount_value: null,
    pax: 2,
    features: null,
    amenities: [],
    status: 'active',
    images: [],
    rating_average: null,
    reviews_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
}

describe('Services availability flows', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getServices).mockResolvedValue({
            data: { success: true, data: [service] },
        } as never)
        vi.mocked(getAvailabilityForRange).mockResolvedValue({
            data: {
                data: {
                    rooms: [{ id: 1, available: true, blocked_intervals: [] }],
                },
            },
        } as never)
        vi.mocked(getBlockedDates).mockResolvedValue({
            data: { data: { unavailable_dates: [] } },
        } as never)
    })

    it('lets a guest add dates first and choose an available room inline on the homepage', async () => {
        render(
            <MemoryRouter>
                <Services bookingOnly />
            </MemoryRouter>,
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Choose check-in date, time, and paid days',
            }),
        )
        fireEvent.change(screen.getByLabelText('Check-in date'), {
            target: { value: '2027-01-10' },
        })

        await waitFor(() => {
            expect(getAvailabilityForRange).toHaveBeenCalled()
        })
        expect(
            await screen.findByRole('button', { name: 'Add Ocean Room' }),
        ).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Add Ocean Room' }))
        expect(
            screen.getByRole('button', { name: 'Remove Ocean Room' }),
        ).toBeInTheDocument()
    })
})
