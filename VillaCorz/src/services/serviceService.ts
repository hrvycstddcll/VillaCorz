import api from './api'
import type { ApiEnvelope, Service } from './types'

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
