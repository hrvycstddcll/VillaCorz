import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Services from './assets/components/pages/Services'
import { getAvailabilityForRange, getBlockedDates } from './services/availabilityService'
import { getServices } from './services/serviceService'

vi.mock('./services/serviceService', () => ({
    getServices: vi.fn(),
}))

vi.mock('./services/availabilityService', async () => {
    const actual = await vi.importActual<
        typeof import('./services/availabilityService')
    >('./services/availabilityService')

    return {
        ...actual,
        getAvailabilityForRange: vi.fn(),
        getBlockedDates: vi.fn(),
    }
})

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

const exclusiveService = {
    ...service,
    id: 2,
    kind: 'exclusive',
    name: 'Whole Villa',
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

    it('marks every room unavailable when the whole villa is booked', async () => {
        vi.mocked(getServices).mockResolvedValue({
            data: { success: true, data: [service, exclusiveService] },
        } as never)
        vi.mocked(getAvailabilityForRange).mockResolvedValue({
            data: {
                data: {
                    rooms: [
                        { id: 1, available: true, blocked_intervals: [] },
                        {
                            id: 2,
                            available: false,
                            blocked_intervals: [
                                {
                                    service_id: 2,
                                    check_in: '2027-01-10T02:00:00.000Z',
                                    check_out: '2027-01-12T00:00:00.000Z',
                                },
                            ],
                        },
                    ],
                },
            },
        } as never)

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
            await screen.findByText('No room available for this date'),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: 'Add Ocean Room' }),
        ).toBeNull()
    })

    it('explains a past check-in instead of calling the availability API', async () => {
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
            target: { value: '2020-01-01' },
        })

        expect(
            await screen.findByText(
                'Check-in time has passed. Choose a later date or time.',
            ),
        ).toBeInTheDocument()
        expect(getAvailabilityForRange).not.toHaveBeenCalled()
    })
})
