import { render, screen } from '@testing-library/react'
import PaymentSuccessView from '../assets/components/pages/PaymentSuccessView'
import StateModal from '../assets/components/ui/ModalComponents/StateModal'

const paymentProps = {
    status: 'pending' as const,
    guestName: 'Juan Dela Cruz',
    email: 'juan@example.com',
    phoneNumber: '+63 900 000 0000',
    bookingId: 'VC-TEST-123',
    qrValue: 'http://192.168.18.25:8000/pay/test-token',
    checkIn: '2026-11-23T06:00:00.000Z',
    checkOut: '2026-11-25T04:00:00.000Z',
    paidDays: 2,
    nights: 2,
    rooms: [{ name: 'Room 1', adults: 2, kids: 0 }],
    total: 3500,
    onConfirm: () => {},
    onRefresh: () => {},
}

describe('payment confirmation UI', () => {
    it('renders the QR and confirmation link without a slide control', () => {
        render(<PaymentSuccessView {...paymentProps} />)

        expect(screen.getByText('Scan to confirm')).toBeInTheDocument()
        expect(screen.getByText('Open confirmation link')).toBeInTheDocument()
        expect(screen.getByText(/2 paid days/)).toBeInTheDocument()
        expect(screen.queryByRole('slider')).not.toBeInTheDocument()
        expect(screen.queryByText('Slide to confirm')).not.toBeInTheDocument()
    })

    it('falls back to nights when paid days are not provided', () => {
        const legacyProps = { ...paymentProps }
        delete (legacyProps as { paidDays?: number }).paidDays
        render(<PaymentSuccessView {...legacyProps} />)

        expect(screen.getByText(/2 nights/)).toBeInTheDocument()
    })

    it('exposes the confirmation link as an external link', () => {
        render(<PaymentSuccessView {...paymentProps} />)

        const link = screen.getByRole('link', {
            name: /Open confirmation link/,
        })

        expect(link).toHaveAttribute('href', paymentProps.qrValue)
        expect(link).toHaveAttribute('target', '_blank')
    })

    it('renders the mascot state modal as an accessible dialog', () => {
        render(
            <StateModal
                state="success"
                title="Reservation confirmed"
                description="Payment received."
                primaryLabel="Return to services"
                onPrimary={() => {}}
                secondaryLabel="View receipt"
                onSecondary={() => {}}
            />,
        )

        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
        expect(screen.getByText('Reservation confirmed')).toBeInTheDocument()
        expect(screen.getByText('Payment received.')).toBeInTheDocument()
    })

    it.each([
        ['cancelled', 'Cancelled'],
        ['empty', 'Empty'],
        ['error', 'Error'],
        ['interrupted', 'Interrupted'],
        ['success', 'Success'],
        ['somethingWentWrong', 'Something Went Wrong'],
    ] as const)('renders the %s mascot state', (state, label) => {
        render(
            <StateModal
                state={state}
                title="State message"
                description="Details for this state."
                primaryLabel="Continue"
                onPrimary={() => {}}
            />,
        )

        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
        expect(screen.getByText(label)).toBeInTheDocument()
    })
})
