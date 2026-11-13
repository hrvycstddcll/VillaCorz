export type User = {
    id: number
    firstname: string
    lastname: string
    email: string
    phone_number?: string | null
    role: string
}

export type ServiceStatus = 'active' | 'inactive'

export type ServiceKind = 'room' | 'exclusive'

export type ServiceDiscountType = 'percent' | 'fixed'

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
    kind: ServiceKind
    name: string
    description: string | null
    price: string | number
    weekend_price: string | number | null
    weekday_discount_type: ServiceDiscountType | null
    weekday_discount_value: string | number | null
    weekend_discount_type: ServiceDiscountType | null
    weekend_discount_value: string | number | null
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

export type ActivityLogUser = {
    id: number
    firstname: string
    lastname: string
    email: string
    role: string
}

export type ActivityLog = {
    id: number
    user_id: number | null
    action: string
    subject_type: string | null
    subject_id: number | null
    subject_label: string | null
    description: string | null
    properties: Record<string, unknown> | null
    ip_address: string | null
    user_agent: string | null
    created_at: string
    user: ActivityLogUser | null
}

export type ActivityLogPage = {
    success: boolean
    data: ActivityLog[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
}

export type ActivityLogSummary = {
    total: number
    changes: number
    access: number
    today: number
}

export type ActivityLogCategory = 'all' | 'changes' | 'access'

export type ActivityLogQuery = {
    category?: ActivityLogCategory
    search?: string
    from?: string
    to?: string
    page?: number
    per_page?: number
}
