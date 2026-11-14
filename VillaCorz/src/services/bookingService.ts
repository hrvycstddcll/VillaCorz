import api from './api'
import type { ApiEnvelope, Booking, CreateBookingInput } from './types'

export const createBooking = (payload: CreateBookingInput, idempotencyKey: string) =>
    api.post<ApiEnvelope<Booking>>('/bookings', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
    })

export const getBooking = (reference: string) =>
    api.get<ApiEnvelope<Booking>>(`/bookings/${encodeURIComponent(reference)}`)

export const getBookings = () =>
    api.get<ApiEnvelope<Booking[]>>('/bookings')

export const cancelBooking = (reference: string) =>
    api.post<ApiEnvelope<Booking>>(`/bookings/${encodeURIComponent(reference)}/cancel`)

export const requestCancellation = (reference: string, formData: FormData) =>
    api.post<ApiEnvelope<{ id: number; status: string; requested_at: string | null }>>(
        `/bookings/${encodeURIComponent(reference)}/cancel-request`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    )
