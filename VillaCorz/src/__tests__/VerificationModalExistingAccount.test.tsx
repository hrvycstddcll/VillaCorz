import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import VerificationModal from '../assets/components/auth/VerificationModal'
import { verifyOtp } from '../services/authService'

vi.mock('../services/authService', () => ({
    verifyOtp: vi.fn(),
    resendOtp: vi.fn(),
}))

const conflictError = () => new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
        status: 409,
        data: { message: 'An account with this email already exists. Please log in.' },
        statusText: 'Conflict',
        headers: {},
        config: {} as never,
    },
)

test('sends duplicate email conflicts back to the login form', async () => {
    vi.mocked(verifyOtp).mockRejectedValueOnce(conflictError())
    const onExistingAccount = vi.fn()

    render(
        <VerificationModal
            email="harvey.custodio@example.com"
            registrationId="6b3f9e6c-3b4a-4d9b-8f4e-1f2a3b4c5d6e"
            expiresIn={600}
            delivery="email"
            developmentCode={null}
            remember={false}
            onVerified={vi.fn()}
            onExistingAccount={onExistingAccount}
            onClose={vi.fn()}
        />,
    )

    screen.getAllByLabelText(/Digit/).forEach((input, index) => {
        fireEvent.change(input, { target: { value: String(index + 1) } })
    })
    fireEvent.click(screen.getByRole('button', { name: /VERIFY/ }))

    await waitFor(() => {
        expect(onExistingAccount).toHaveBeenCalledWith('harvey.custodio@example.com')
    })
})
