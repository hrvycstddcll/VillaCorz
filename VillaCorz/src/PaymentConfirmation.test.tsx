import { fireEvent, render, screen } from '@testing-library/react'
import PaymentSuccessView from './assets/components/pages/PaymentSuccessView'
import PaymentStateModal from './assets/components/ui/ModalComponents/PaymentStateModal'

const paymentProps = {
    status: 'pending' as const,
    guestName: 'Juan Dela Cruz',
    email: 'juan@example.com',
    phoneNumber: '+63 900 000 0000',
    bookingId: 'VC-TEST-123',
    qrValue: 'http://192.168.18.25:8000/pay/test-token',
    checkIn: '2026-11-23T06:00:00.000Z',
    checkOut: '2026-11-25T04:00:00.000Z',
    nights: 2,
    rooms: [{ name: 'Room 1', adults: 2, kids: 0 }],
    total: 3500,
    onConfirm: () => {},
    onRefresh: () => {},
}

describe('payment confirmation UI', () => {
    it('renders the QR and slide confirmation controls together', () => {
        render(
            <PaymentSuccessView
                {...paymentProps}
                onConfirmPayment={vi.fn().mockResolvedValue(undefined)}
            />,
        )

        expect(screen.getByText('Scan to confirm')).toBeInTheDocument()
        expect(screen.getByText('Open confirmation link')).toBeInTheDocument()
        expect(
            screen.getByRole('slider', { name: 'Slide to confirm' }),
        ).toBeInTheDocument()
    })

    it('starts payment confirmation from the keyboard-accessible slide control', () => {
        const onConfirmPayment = vi.fn().mockResolvedValue(undefined)

        render(
            <PaymentSuccessView
                {...paymentProps}
                onConfirmPayment={onConfirmPayment}
            />,
        )

        fireEvent.keyDown(
            screen.getByRole('slider', { name: 'Slide to confirm' }),
            { key: 'End' },
        )

        expect(onConfirmPayment).toHaveBeenCalledTimes(1)
    })

    it('renders the mascot state modal as an accessible dialog', () => {
        render(
            <PaymentStateModal
                image="/mascots/PaymentConfirmation.jpg"
                tone="success"
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
})
