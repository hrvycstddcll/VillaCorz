import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Offers from '../assets/components/pages/Offers'
import { getDashboard } from '../services/dashboardService'
import { getServices } from '../services/serviceService'
import type { DashboardSummary, Service } from '../services/types'

vi.mock('../services/dashboardService', () => ({
    getDashboard: vi.fn(),
}))

vi.mock('../services/serviceService', () => ({
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
    return screen.findByRole('table', { name: /offer catalogue performance/i })
}

beforeEach(() => {
    vi.clearAllMocks()
})

it('opens the edit form when an offer row is clicked', async () => {
    const table = await renderOffers()
    const villaRow = within(table).getByText('Villa A').closest('tr')

    expect(villaRow).not.toBeNull()
    fireEvent.click(villaRow as HTMLTableRowElement)

    const dialog = await screen.findByRole('dialog', { name: /edit offer/i })
    expect(within(dialog).getByLabelText(/offer name/i)).toHaveValue('Villa A')
})

it('does not open the edit form when opening the action menu', async () => {
    const table = await renderOffers()
    const actionButton = within(table).getByRole('button', {
        name: /Actions for Room B/i,
    })

    fireEvent.click(actionButton)

    const menu = screen.getByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: /edit offer/i })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
})

it('keeps the action menu open when the page scrolls', async () => {
    const table = await renderOffers()
    const actionButton = within(table).getByRole('button', {
        name: /Actions for Room B/i,
    })

    fireEvent.click(actionButton)
    const menu = screen.getByRole('menu')
    expect(menu).toBeInTheDocument()
    expect(menu.style.visibility).toBe('visible')

    fireEvent.scroll(window)

    expect(screen.getByRole('menu')).toBeInTheDocument()
})
