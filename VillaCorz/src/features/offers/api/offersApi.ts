import api from '../../../services/api'
import type { ApiEnvelope, Service } from '../../../services/types'
import {
    deleteService,
    getServices,
    updateService,
} from '../../../services/serviceService'

export type OfferMetrics = {
    service_id: number
    name: string
    bookings: number
    revenue: number
    occupancy: number
    rating: number
}

export type OfferSummary = {
    services: Service[]
    offer_metrics: OfferMetrics[]
    availability: Record<string, { check_in: string; check_out: string }[]>
    range: number
}

export const fetchOffers = () => getServices()

export const fetchOfferMetrics = (range: 7 | 30 | 90 = 30) =>
    api.get<{ success: boolean; data: OfferSummary }>(`/admin/offers?range=${range}`)

export const updateOfferStatus = (id: number, status: Service['status']) =>
    api.patch<ApiEnvelope<Service>>(`/services/${id}/status`, { status })

export const deleteOffer = (id: number) => deleteService(id)

export { updateService }
