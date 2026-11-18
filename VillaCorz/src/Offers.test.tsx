import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Offers from './assets/components/pages/Offers'
import { getDashboard } from './services/dashboardService'
import { getServices } from './services/serviceService'
import type { DashboardSummary, Service } from './services/types'

vi.mock('./services/dashboardService', () => ({
    getDashboard: vi.fn(),
}))

vi.mock('./services/serviceService', () => ({
    deleteService: vi.fn(),
    getServices: vi.fn(),
    updateServiceStatus: vi.fn(),
}))

const services = [
    {
        id: 1,
        name: 'Villa A',
        kind: 'exclusive',
        status: 'active',
        price: '12000',
        rating_average: '4.8',
        weekday_discount_type: null,
        weekend_discount_type: null,
    },
    {
        id: 2,
        name: 'Room B',
        kind: 'room',
        status: 'active',
        price: '4500',
        rating_average: '4.6',
        weekday_discount_type: null,
        weekend_discount_type: null,
    },
    {
        id: 3,
        name: 'Villa C',
        kind: 'exclusive',
        status: 'active',
        price: '15000',
        rating_average: '4.9',
        weekday_discount_type: null,
        weekend_discount_type: null,
    },
] as unknown as Service[]

const summary = {
    offer_metrics: [],
    availability: {},
} as unknown as DashboardSummary

const renderOffers = async () => {
    vi.mocked(getServices).mockResolvedValue({ data: { data: services } } as never)
    vi.mocked(getDashboard).mockResolvedValue({ data: { data: summary } } as never)
    render(
        <MemoryRouter>
            <Offers />
        </MemoryRouter>,
    )
    await screen.findByRole('grid')
}

beforeEach(() => {
    vi.clearAllMocks()
})

it('supports plain, shift, and ctrl selection without checkboxes', async () => {
    await renderOffers()
    const grid = screen.getByRole('grid')
    const rows = within(grid).getAllByRole('row').slice(1)

    expect(document.querySelector('input[type="checkbox"]')).toBeNull()

    fireEvent.click(rows[0])
    expect(rows[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('1 selected')).toBeInTheDocument()

    fireEvent.click(rows[2], { shiftKey: true })
    expect(rows[1]).toHaveAttribute('aria-selected', 'true')
    expect(rows[2]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('3 selected')).toBeInTheDocument()

    fireEvent.click(rows[1], { ctrlKey: true })
    expect(rows[1]).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText('2 selected')).toBeInTheDocument()
})

it('keeps the action menu open when the page scrolls', async () => {
    await renderOffers()
    const grid = screen.getByRole('grid')
    const actionButton = within(grid).getAllByRole('button', {
        name: /Actions for Room B/i,
    })[0]

    fireEvent.click(actionButton)
    const menu = screen.getByRole('menu')
    expect(menu).toBeInTheDocument()
    expect(menu.style.visibility).toBe('visible')

    fireEvent.scroll(window)

    expect(screen.getByRole('menu')).toBeInTheDocument()
})

it('does not select offers when opening the edit form or action menu', async () => {
    await renderOffers()
    const grid = screen.getByRole('grid')
    const offerButton = within(grid).getAllByRole('button', { name: /Villa A/i })[0]

    fireEvent.click(offerButton)
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()

    const actionButton = within(grid).getAllByRole('button', {
        name: /Actions for Villa A/i,
    })[0]
    fireEvent.click(actionButton)
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
})
