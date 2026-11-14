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
