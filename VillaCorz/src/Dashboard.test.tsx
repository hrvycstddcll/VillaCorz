import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './assets/components/pages/Dashboard'
import { getDashboard } from './services/dashboardService'
import { adjustServicePrice } from './services/serviceService'
import type { DashboardSummary } from './services/types'

vi.mock('./services/dashboardService', () => ({
    getDashboard: vi.fn(),
}))

vi.mock('./services/serviceService', () => ({
    adjustServicePrice: vi.fn(),
}))

const summary: DashboardSummary = {
    range: 30,
    start: '2026-10-19',
    end: '2026-11-17',
    metrics: {
        revenue: 12500,
        paid_count: 5,
        check_ins: 3,
        new_bookings: 6,
        new_users: 4,
        website_visits: 120,
        cancelled_bookings: 1,
        expired_payments: 1,
        pending_payments: 1,
        conversion_rate: 83.3,
        churn_rate: 16.7,
        dropoff_rate: 95.8,
    },
    comparison: {
        revenue: { current: 12500, previous: 10000, delta: 2500, percent: 25 },
        check_ins: { current: 3, previous: 2, delta: 1, percent: 50 },
        new_bookings: { current: 6, previous: 5, delta: 1, percent: 20 },
        new_users: { current: 4, previous: 3, delta: 1, percent: 33.3 },
        website_visits: { current: 120, previous: 100, delta: 20, percent: 20 },
        conversion_rate: { current: 83.3, previous: 70, delta: 13.3, percent: 19 },
        churn_rate: { current: 16.7, previous: 20, delta: -3.3, percent: -16.5 },
        dropoff_rate: { current: 95.8, previous: 96, delta: -0.2, percent: -0.2 },
    },
    series: [
        { date: '2026-11-16', bookings: 2, revenue: 5000, visits: 20 },
        { date: '2026-11-17', bookings: 1, revenue: 7500, visits: 25 },
    ],
    top_services: [],
    recent_bookings: Array.from({ length: 6 }, (_, index) => ({
        reference: `VC-REC-${index + 1}`,
        guest: `Guest ${index + 1}`,
        email: `guest${index + 1}@example.com`,
        stay: ['Seaview Room'],
        status: 'confirmed',
        lifecycle: 'booked',
        total: 2500,
        currency: 'PHP',
        payment_status: 'paid',
        created_at: null,
        check_in: null,
        check_out: null,
    })),
    action_center: {
        pending_cancellations: 0,
        unpublished_reviews: 0,
        expired_payments: 0,
        contact_messages: 0,
    },
    revenue_by_weekday: [0, 0, 0, 0, 0, 0, 0],
    offer_metrics: [],
    availability: {},
    operational: {
        occupancy: 35,
        adr: 2500,
        revpar: 875,
        booked_forward_revenue: 5000,
    },
    funnel: {
        visits: 120,
        bookings: 6,
        paid: 5,
        dropoff_total: 115,
        steps: [
            {
                key: 'visits',
                label: 'Site visits',
                count: 120,
                dropoff: null,
                dropoff_rate: null,
            },
            {
                key: 'bookings',
                label: 'Bookings started',
                count: 6,
                dropoff: 114,
                dropoff_rate: 95,
            },
            {
                key: 'paid',
                label: 'Payments completed',
                count: 5,
                dropoff: 1,
                dropoff_rate: 16.7,
            },
        ],
    },
    dropoff_reasons: [],
    pricing_insights: {
        model: 'sarimax',
        forecast_preset: '30',
        forecast_window: { start: '2026-11-18', end: '2026-12-17' },
        forecast: [
            {
                date: '2026-11-18',
                label: 'Nov 18',
                expected_bookings: 1.2,
                expected_occupancy: 72,
                factor: 1,
                is_weekend: false,
                holiday: null,
            },
        ],
        holiday_days: 0,
        average_forecast_occupancy: 72,
        accuracy: {
            window_days: 7,
            model: 'sarimax',
            mae: 0.4,
            mape: 12.5,
            points: [
                {
                    date: '2026-11-17',
                    label: 'Nov 17',
                    actual_bookings: 2,
                    predicted_bookings: 1.6,
                },
            ],
        },
        recommendations: [
            {
                service_id: 1,
                name: 'Seaview Room',
                current_price: 2500,
                suggested_price: 3000,
                change_percent: 20,
                direction: 'increase',
                confidence: 'medium',
                current_occupancy: 60,
                forward_occupancy: 40,
                demand_score: 62,
                reasons: ['Strong forward demand'],
            },
        ],
        factors: [],
    },
}

const getDashboardResponse = {
    data: {
        success: true,
        data: summary,
    },
}

describe('Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getDashboard).mockResolvedValue(
            getDashboardResponse as Awaited<ReturnType<typeof getDashboard>>,
        )
    })

    it('keeps the KPI strip to four primary metrics', async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>,
        )

        await screen.findByRole('button', { name: 'Review adjustment' })
        const metrics = screen.getAllByRole('group', { name: 'Key metrics' })[0]
        expect(within(metrics).getByText('New bookings')).toBeInTheDocument()
        expect(within(metrics).getByText('Occupancy')).toBeInTheDocument()
        expect(within(metrics).getByText('Churn')).toBeInTheDocument()
        expect(within(metrics).getByText('Conversion')).toBeInTheDocument()
        expect(within(metrics).queryByText('Check-ins')).not.toBeInTheDocument()
        expect(within(metrics).queryByText('New guests')).not.toBeInTheDocument()
        expect(within(metrics).queryByText('Drop-off')).not.toBeInTheDocument()
        expect(within(metrics).queryByText('Site visits')).not.toBeInTheDocument()
    })

    it('shows only five recent reservations until Show more is selected', async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>,
        )

        const table = await screen.findByRole('table', {
            name: 'Recent bookings',
        })
        expect(within(table).getAllByRole('row')).toHaveLength(6)

        fireEvent.click(screen.getByRole('button', { name: 'Show more (1)' }))

        expect(within(table).getAllByRole('row')).toHaveLength(7)
        fireEvent.click(screen.getByRole('button', { name: 'Show fewer' }))

        expect(within(table).getAllByRole('row')).toHaveLength(6)
    })

    it('uses one chart for actual-vs-predicted and price prediction views', async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>,
        )

        expect(
            await screen.findByRole('group', {
                name: /Actual and predicted bookings/,
            }),
        ).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Price prediction' }))

        expect(
            await screen.findByRole('group', {
                name: /Projected base prices/,
            }),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('group', {
                name: /Actual and predicted bookings/,
            }),
        ).not.toBeInTheDocument()
        expect(
            screen.getByRole('heading', { name: 'Price recommendations' }),
        ).toBeInTheDocument()
    })

    it('only changes an offer price after explicit confirmation', async () => {
        vi.mocked(adjustServicePrice).mockResolvedValue({
            data: {
                success: true,
                message: 'Offer price updated.',
                data: {} as never,
            },
        } as Awaited<ReturnType<typeof adjustServicePrice>>)

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>,
        )

        fireEvent.click(await screen.findByRole('button', { name: 'Review adjustment' }))
        expect(screen.getByRole('dialog')).toHaveTextContent(
            'Change the base price from ₱2,500 to ₱3,000',
        )
        expect(adjustServicePrice).not.toHaveBeenCalled()

        fireEvent.click(screen.getByRole('button', { name: 'Confirm price update' }))

        await waitFor(() => {
            expect(adjustServicePrice).toHaveBeenCalledWith(1, 3000)
        })
        expect(await screen.findByText('Offer price updated.')).toBeInTheDocument()
    })
})
