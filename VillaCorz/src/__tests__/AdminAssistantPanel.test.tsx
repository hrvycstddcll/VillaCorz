import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminAssistantPanel from './assets/components/admin/AdminAssistantPanel'
import { sendAssistantMessage } from './services/assistantService'

vi.mock('./services/assistantService', () => ({
    sendAssistantMessage: vi.fn(),
}))

const mockedSend = vi.mocked(sendAssistantMessage)

const answer = 'Revenue rose in the selected window. Verify figures in Reports before acting.'

const renderPanel = () =>
    render(
        <MemoryRouter initialEntries={['/reports?report=revenue&from=2026-11-01&to=2026-11-18&range=30']}>
            <AdminAssistantPanel />
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
                    page: 'reports',
                    report: 'revenue',
                    window: {
                        start: '2026-11-01',
                        end: '2026-11-18',
                        days: 18,
                        capped_to_90_days: false,
                    },
                },
                generated_at: '2026-11-18T00:00:00+00:00',
            },
        },
    } as Awaited<ReturnType<typeof sendAssistantMessage>>)
})

test('sends page context and renders the assistant answer', async () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Ask AI about reports' }))
    fireEvent.change(screen.getByLabelText('Ask a question about your reports'), {
        target: { value: 'What happened with revenue?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }))

    await waitFor(() => {
        expect(screen.getByText(answer)).toBeInTheDocument()
    })

    expect(mockedSend).toHaveBeenCalledWith({
        message: 'What happened with revenue?',
        context: {
            page: 'reports',
            report: 'revenue',
            from: '2026-11-01',
            to: '2026-11-18',
            range: 30,
        },
        history: [],
    })
})

test('shows a friendly error when the assistant is unavailable', async () => {
    mockedSend.mockRejectedValueOnce(new Error('offline'))
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Ask AI about reports' }))
    fireEvent.click(screen.getByRole('button', { name: 'What happened with revenue in this period?' }))

    await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable')
    })
})
