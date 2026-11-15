import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyBookings from './assets/components/pages/MyBookings'
import { getBookings } from './services/bookingService'

vi.mock('./services/bookingService', () => ({
    getBookings: vi.fn(),
    cancelBooking: vi.fn(),
}))

const addDays = (days: number) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + days)
    return date.toISOString().slice(0, 10)
}

const makeBooking = (
    reference: string,
    lifecycle: 'booked' | 'cancelled' | 'completed' | 'pending' | 'expired',
    checkIn: string,
) => ({
    reference,
    status: lifecycle === 'cancelled' ? 'cancelled' : 'confirmed',
    lifecycle,
    completed_at: null,
    check_in: checkIn,
    check_out: addDays(2),
    nights: 2,
    adults: 2,
    kids: 0,
    subtotal: '5000.00',
    total: '5000.00',
    currency: 'PHP',
    payment_method: 'GCash',
    confirmed_at: null,
    confirmation_email_sent_at: null,
    contact: { name: 'Guest', email: 'guest@example.com', phone: null },
    rooms: [
        {
            service_id: 3,
            name: 'Room 1',
            kind: 'room' as const,
            adults: 2,
            kids: 0,
            weekday_price: '2500.00',
            weekend_price: '2500.00',
            line_total: '5000.00',
            description: null,
            image_url: null,
        },
    ],
    payment: null,
    cancellation_request: null,
    created_at: new Date().toISOString(),
})

const renderBookings = (bookings: unknown[]) => {
    vi.mocked(getBookings).mockResolvedValue({
        data: { data: bookings },
    } as never)

    return render(
        <MemoryRouter>
            <MyBookings />
        </MemoryRouter>,
    )
}

describe('MyBookings', () => {
    beforeEach(() => {
        vi.mocked(getBookings).mockReset()
    })

    it('does not offer cancellation for a stay that is already cancelled', async () => {
        renderBookings([makeBooking('VC-CANCELLED-1', 'cancelled', addDays(20))])

        await screen.findByText('VC-CANCELLED-1')

        expect(
            screen.queryByRole('button', { name: /cancel booking/i }),
        ).not.toBeInTheDocument()
    })

    it('does not offer cancellation for a completed stay', async () => {
        renderBookings([makeBooking('VC-COMPLETED-1', 'completed', addDays(-10))])

        await screen.findByText('VC-COMPLETED-1')

        expect(
            screen.queryByRole('button', { name: /cancel booking/i }),
        ).not.toBeInTheDocument()
    })

    it('still offers cancellation for an upcoming confirmed stay', async () => {
        renderBookings([makeBooking('VC-BOOKED-1', 'booked', addDays(20))])

        await screen.findByText('VC-BOOKED-1')

        expect(
            screen.getByRole('button', { name: /cancel booking/i }),
        ).toBeInTheDocument()
    })
})
