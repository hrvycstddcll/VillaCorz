import { normalizePaidDays } from '../lib/stayDateTime'
import api from './api'
import type { ApiEnvelope } from './types'

export type BlockingInterval = {
    booking_id?: number
    reference?: string
    service_id: number
    service_kind?: 'room' | 'exclusive'
    status?: 'confirmed' | 'pending_payment'
    check_in: string
    check_out: string
    blocking_end?: string
}

export type ServiceAvailability = {
    id: number
    available: boolean
    blocked_intervals: BlockingInterval[]
}

export type AvailabilityRange = {
    as_of: string
    basis: string
    check_in: string
    check_out: string
    paid_days?: number
    rooms: ServiceAvailability[]
}

export type BlockedDates = {
    as_of: string
    basis: string
    service_id: number
    unavailable_dates: string[]
}

export const getAvailabilityForRange = (
    checkIn: string,
    paidDays: number,
    signal?: AbortSignal,
) =>
    api.get<ApiEnvelope<AvailabilityRange>>('/services/availability', {
        params: { check_in: checkIn, paid_days: normalizePaidDays(paidDays) },
        signal,
    })

export const getBlockedDates = (
    serviceId: number,
    from: string,
    to: string,
    signal?: AbortSignal,
) =>
    api.get<ApiEnvelope<BlockedDates>>(
        `/services/${serviceId}/blocked-dates`,
        { params: { from, to }, signal },
    )

export const wholeVillaIsBooked = (
    rooms: ServiceAvailability[],
    exclusiveServiceId: number | null,
) =>
    exclusiveServiceId !== null &&
    rooms.some(
        (room) =>
            room.id === exclusiveServiceId &&
            room.blocked_intervals.some(
                (interval) => interval.service_id === exclusiveServiceId,
            ),
    )
