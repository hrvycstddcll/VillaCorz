import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SettingsHub from './assets/components/pages/SettingsHub'

// Mock useAuth to avoid network calls.
vi.mock('./services/useAuth', () => ({
    useAuth: () => ({
        user: {
            id: 1,
            firstname: 'Juan',
            lastname: 'Dela Cruz',
            email: 'juan@example.com',
            role: 'customer',
        },
        logout: vi.fn().mockResolvedValue(undefined),
    }),
}))

describe('SettingsHub', () => {
    it('renders identity and the two option cards', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        )
        expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument()
        expect(screen.getByText('juan@example.com')).toBeInTheDocument()
        expect(screen.getByText('Account settings')).toBeInTheDocument()
        expect(screen.getByText('Log out')).toBeInTheDocument()
        expect(screen.getByText(/System settings will appear here/)).toBeInTheDocument()
    })

    it('opens the logout modal when Log out is clicked', () => {
        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        )
        fireEvent.click(screen.getByText('Log out'))
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
})
