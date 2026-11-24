import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SettingsHub from '../assets/components/pages/SettingsHub'

const authState = vi.hoisted(() => ({ role: 'customer' }))

const backupMocks = vi.hoisted(() => ({
    listBackups: vi.fn(),
    createBackup: vi.fn(),
    downloadBackup: vi.fn(),
}))

vi.mock('../services/useAuth', () => ({
    useAuth: () => ({
        user: {
            id: 1,
            firstname: 'Juan',
            lastname: 'Dela Cruz',
            email: 'juan@example.com',
            role: authState.role,
        },
        logout: vi.fn().mockResolvedValue(undefined),
    }),
}))

vi.mock('../services/backupService', () => backupMocks)

describe('SettingsHub', () => {
    beforeEach(() => {
        authState.role = 'customer'
        vi.clearAllMocks()
        backupMocks.listBackups.mockResolvedValue({
            data: { success: true, data: [] },
        })
        backupMocks.createBackup.mockResolvedValue({
            data: {
                success: true,
                data: {
                    filename: 'villacorz-backup-20261124-000000.sql',
                    size: 1024,
                    created_at: '2026-11-24T00:00:00+00:00',
                },
            },
        })
        backupMocks.downloadBackup.mockResolvedValue({ data: new Blob(['sql']) })
    })

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

    it('lets an admin save and list backups', async () => {
        authState.role = 'admin'
        backupMocks.listBackups.mockResolvedValueOnce({
            data: { success: true, data: [] },
        })

        render(
            <MemoryRouter>
                <SettingsHub />
            </MemoryRouter>,
        )

        expect(await screen.findByText('No backups saved yet.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Save backup' })).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Save backup' }))

        await waitFor(() => {
            expect(backupMocks.createBackup).toHaveBeenCalledTimes(1)
        })
        expect(
            await screen.findByText('villacorz-backup-20261124-000000.sql'),
        ).toBeInTheDocument()
    })
})
