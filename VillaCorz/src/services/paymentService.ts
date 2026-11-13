import api from './api'
import type { ApiEnvelope, PaymentStatus } from './types'

export const getPaymentStatus = (reference: string) =>
    api.get<ApiEnvelope<PaymentStatus>>(
        `/payments/${encodeURIComponent(reference)}/status`,
    )