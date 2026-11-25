import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import VerificationModal from '../assets/components/auth/VerificationModal'
import { verifyOtp } from '../services/authService'
import type { User } from '../services/types'

vi.mock('../services/authService', () => ({
    verifyOtp: vi.fn(),
    resendOtp: vi.fn(),
}))

const user = {
    id: 21,
    firstname: 'Harvey',
    lastname: 'Custodio',
    email: 'harvey.custodio@example.com',
    role: 'customer',
} as User

const axiosError = (
    status: number,
    data: Record<string, unknown>,
    headers: Record<string, string> = {},
) => new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
        status,
        data,
        statusText: 'Request failed',
        headers,
        config: {} as never,
    },
)

const renderModal = (overrides: Partial<Parameters<typeof VerificationModal>[0]> = {}) => {
    const props = {
        email: 'harvey.custodio@example.com',
        registrationId: '6b3f9e6c-3b4a-4d9b-8f4e-1f2a3b4c5d6e',
        expiresAt: Date.now() + 600_000,
        delivery: 'email' as const,
        developmentCode: null,
        remember: false,
        onVerified: vi.fn(),
        onExistingAccount: vi.fn(),
        onVerificationUpdated: vi.fn(),
        onInvalidated: vi.fn(),
        onClose: vi.fn(),
        ...overrides,
    }

    render(<VerificationModal {...props} />)
    return props
}

const enterOtp = () => {
    screen.getAllByLabelText(/Digit/).forEach((input, index) => {
        fireEvent.change(input, { target: { value: String(index + 1) } })
    })
}

beforeEach(() => {
    vi.clearAllMocks()
})

test('sends duplicate email conflicts back to the login form', async () => {
    vi.mocked(verifyOtp).mockRejectedValueOnce(axiosError(409, {
        code: 'duplicate_account',
        message: 'An account with this email already exists. Please log in.',
    }))
    const props = renderModal()

    enterOtp()
    fireEvent.click(screen.getByRole('button', { name: /VERIFY/ }))

    await waitFor(() => {
        expect(props.onExistingAccount).toHaveBeenCalledWith('harvey.custodio@example.com')
    })
})

test('clears the OTP inputs after an invalid code and keeps verification available', async () => {
    vi.mocked(verifyOtp).mockRejectedValueOnce(axiosError(422, {
        code: 'invalid_otp',
        message: 'Invalid verification code.',
        attempts_remaining: 2,
    }))
    const props = renderModal()

    enterOtp()
    fireEvent.click(screen.getByRole('button', { name: /VERIFY/ }))

    await waitFor(() => {
        expect(screen.getByText(/2 attempts remaining/)).toBeTruthy()
    })
    expect(screen.getAllByLabelText(/Digit/).every((input) => (input as HTMLInputElement).value === '')).toBe(true)
    expect(screen.getByRole('button', { name: /VERIFY/ })).toBeTruthy()
    expect(props.onInvalidated).not.toHaveBeenCalled()
})

test('expired registrations are invalidated instead of permanently locking the modal', async () => {
    vi.mocked(verifyOtp).mockRejectedValueOnce(axiosError(422, {
        code: 'registration_expired',
        message: 'This registration has expired. Please register again.',
    }))
    const props = renderModal()

    enterOtp()
    fireEvent.click(screen.getByRole('button', { name: /VERIFY/ }))

    await waitFor(() => {
        expect(props.onInvalidated).toHaveBeenCalledWith('This registration has expired. Please register again.')
    })
})

test('rate limits are shown as a temporary cooldown', async () => {
    vi.mocked(verifyOtp).mockRejectedValueOnce(axiosError(429, {
        message: 'Too Many Attempts.',
    }, { 'retry-after': '45' }))
    const props = renderModal()

    enterOtp()
    fireEvent.click(screen.getByRole('button', { name: /VERIFY/ }))

    await waitFor(() => {
        expect(screen.getByText(/Retry in 45s/)).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: /VERIFY/ })).toBeTruthy()
    expect(props.onInvalidated).not.toHaveBeenCalled()
})

test('server errors do not invalidate the registration', async () => {
    vi.mocked(verifyOtp).mockRejectedValueOnce(axiosError(502, {}))
    const props = renderModal()

    enterOtp()
    fireEvent.click(screen.getByRole('button', { name: /VERIFY/ }))

    await waitFor(() => {
        expect(screen.getByText('The server is temporarily unavailable. Please try again.')).toBeTruthy()
    })
    expect(props.onInvalidated).not.toHaveBeenCalled()
})

test('successful verification returns the issued token to the caller', async () => {
    vi.mocked(verifyOtp).mockResolvedValueOnce({
        data: {
            user,
            token: 'issued-token',
            token_type: 'Bearer',
            expires_at: '2026-11-26T00:00:00+00:00',
        },
    } as never)
    const props = renderModal()

    enterOtp()
    fireEvent.click(screen.getByRole('button', { name: /VERIFY/ }))

    await waitFor(() => {
        expect(props.onVerified).toHaveBeenCalledWith(
            user,
            'issued-token',
            '2026-11-26T00:00:00+00:00',
        )
    })
})

describe('verification modal timers', () => {
    test('an already expired code offers a way back to registration', () => {
        const props = renderModal({ expiresAt: Date.now() - 1000 })

        fireEvent.click(screen.getByRole('button', { name: 'Back to registration' }))

        expect(props.onInvalidated).toHaveBeenCalledWith('Your verification code has expired. Please register again.')
    })
})
