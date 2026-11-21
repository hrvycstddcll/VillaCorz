import api from './api'
import type {
    ApiEnvelope,
    PaymentConfirmationResult,
    PaymentStatus,
} from './types'

export const getPaymentStatus = (reference: string) =>
    api.get<ApiEnvelope<PaymentStatus>>(
        `/payments/${encodeURIComponent(reference)}/status`,
    )

export const confirmPayment = (reference: string) =>
    api.post<ApiEnvelope<PaymentConfirmationResult>>(
        `/payments/${encodeURIComponent(reference)}/confirm`,
    )
