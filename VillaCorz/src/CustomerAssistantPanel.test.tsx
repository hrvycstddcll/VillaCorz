import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CustomerAssistantPanel from './assets/components/customer/CustomerAssistantPanel'
import { sendCustomerAssistantMessage } from './services/customerAssistantService'

vi.mock('./services/customerAssistantService', () => ({
    sendCustomerAssistantMessage: vi.fn(),
}))

const mockedSend = vi.mocked(sendCustomerAssistantMessage)

const answer = 'Your next stay is visible in My bookings. Check My bookings for final details.'

const renderPanel = (path = '/bookings') =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <CustomerAssistantPanel />
        </MemoryRouter>,
    )

beforeEach(() => {
    mockedSend.mockReset()
    mockedSend.mockResolvedValue({
        data: {
            success: true,
            data: {
                answer,
                sources: {
                    page: 'bookings',
                    generated_at: '2026-11-19T00:00:00+00:00',
                },
            },
        },
    } as Awaited<ReturnType<typeof sendCustomerAssistantMessage>>)
})

test('sends customer page context and renders the answer', async () => {
    renderPanel()

    fireEvent.click(
        screen.getByRole('button', { name: 'Ask VillaCorz assistant' }),
    )
    fireEvent.change(
        screen.getByLabelText('Ask about your booking or stay'),
        {
            target: { value: 'When is my next stay?' },
        },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }))

    await waitFor(() => {
        expect(screen.getByText(answer)).toBeInTheDocument()
    })

    expect(mockedSend).toHaveBeenCalledWith({
        message: 'When is my next stay?',
        context: { page: 'bookings' },
        history: [],
    })
})

test('shows a friendly error when the assistant is unavailable', async () => {
    mockedSend.mockRejectedValueOnce(new Error('offline'))
    renderPanel()

    fireEvent.click(
        screen.getByRole('button', { name: 'Ask VillaCorz assistant' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'When is my next stay?' }))

    await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
            'temporarily unavailable',
        )
    })
})

test('keeps the assistant above the fixed booking bar on the home page', () => {
    renderPanel('/')

    const launcher = screen.getByRole('button', {
        name: 'Ask VillaCorz assistant',
    })
    expect(launcher).toHaveClass('bottom-24')
    expect(launcher).not.toHaveClass('bottom-6')

    fireEvent.click(launcher)

    const panel = screen.getByRole('dialog', {
        name: 'VillaCorz customer assistant',
    })
    expect(panel).toHaveClass('bottom-24')
    expect(panel).toHaveClass('max-sm:bottom-24')
    expect(panel).not.toHaveClass('bottom-6')
})

test('keeps the assistant above the fixed booking bar on the services page', () => {
    renderPanel('/services')

    const launcher = screen.getByRole('button', {
        name: 'Ask VillaCorz assistant',
    })
    expect(launcher).toHaveClass('bottom-24')
    expect(launcher).not.toHaveClass('bottom-6')

    fireEvent.click(launcher)

    const panel = screen.getByRole('dialog', {
        name: 'VillaCorz customer assistant',
    })
    expect(panel).toHaveClass('max-sm:bottom-24')
    expect(panel).not.toHaveClass('max-sm:bottom-3')
})
