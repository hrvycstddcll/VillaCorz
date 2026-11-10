export type User = {
    id: number
    firstname: string
    lastname: string
    email: string
    role: string
}

export type ServiceStatus = 'active' | 'inactive'

export type ServiceImage = {
    id: number
    service_id: number
    image_url: string
    public_id: string
    is_primary: boolean
    sort_order: number
    created_at: string
    updated_at: string
}

export type Service = {
    id: number
    created_by: number | null
    name: string
    description: string | null
    price: string | number
    pax: number | null
    features: string[] | null
    amenities: string[] | null
    status: ServiceStatus
    images: ServiceImage[]
    created_at: string
    updated_at: string
}

export type ApiEnvelope<T> = {
    success: boolean
    message?: string
    data: T
}
