import api from './api'
import type { ApiEnvelope, Service, ServiceReview } from './types'

const multipartConfig = {
    headers: {
        'Content-Type': 'multipart/form-data',
    },
}

export const getServices = () => api.get<ApiEnvelope<Service[]>>('/services')

export const getService = (id: number) =>
    api.get<ApiEnvelope<Service>>(`/services/${id}`)

export const createService = (payload: FormData) =>
    api.post<ApiEnvelope<Service>>('/services', payload, multipartConfig)

export const updateService = (id: number, payload: FormData) => {
    payload.append('_method', 'PUT')

    return api.post<ApiEnvelope<Service>>(
        `/services/${id}`,
        payload,
        multipartConfig,
    )
}

export const updateServiceStatus = (service: Service, status: Service['status']) => {
    const payload = new FormData()
    payload.append('name', service.name)
    payload.append('kind', service.kind)
    payload.append('description', service.description ?? '')
    payload.append('price', String(service.price))
    payload.append('weekend_price', service.weekend_price == null ? '' : String(service.weekend_price))
    payload.append('weekday_discount_type', service.weekday_discount_type ?? '')
    payload.append(
        'weekday_discount_value',
        service.weekday_discount_value == null ? '' : String(service.weekday_discount_value),
    )
    payload.append('weekend_discount_type', service.weekend_discount_type ?? '')
    payload.append(
        'weekend_discount_value',
        service.weekend_discount_value == null ? '' : String(service.weekend_discount_value),
    )
    payload.append('pax', service.pax == null ? '' : String(service.pax))
    payload.append('features_present', '1')
    service.features?.forEach((feature) => payload.append('features[]', feature))
    payload.append('amenities_present', '1')
    service.amenities?.forEach((amenity) => payload.append('amenities[]', amenity))
    payload.append('status', status)
    payload.append('image_order_present', '1')

    service.images.forEach((image) =>
        payload.append('image_order[]', `existing:${image.id}`),
    )
    const primaryImage = service.images.find((image) => image.is_primary) ?? service.images[0]
    if (primaryImage) payload.append('primary_image', `existing:${primaryImage.id}`)

    return updateService(service.id, payload)
}

export const deleteService = (id: number) =>
    api.delete<ApiEnvelope<null>>(`/services/${id}`)

export const getServiceReviews = (id: number, page = 1) =>
    api.get<{
        success: boolean
        data: ServiceReview[]
        meta: {
            current_page: number
            last_page: number
            total: number
            average_rating: number
            reviews_count: number
        }
    }>(`/services/${id}/reviews`, { params: { page } })

export const canReviewService = (id: number) =>
    api.get<ApiEnvelope<{ eligible: boolean; reason: string | null }>>(
        `/services/${id}/can-review`,
    )

export const createServiceReview = (id: number, payload: FormData) =>
    api.post<ApiEnvelope<ServiceReview>>(`/services/${id}/reviews`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })

export const updateServiceReview = (id: number, payload: FormData) =>
    api.post<ApiEnvelope<ServiceReview>>(`/reviews/${id}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })

export const deleteServiceReview = (id: number) =>
    api.delete<ApiEnvelope<null>>(`/reviews/${id}`)
