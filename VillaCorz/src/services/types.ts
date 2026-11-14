export type UserPhoneNumber = {
    id: number
    phone_number: string
    is_primary: boolean
    verified_at: string | null
}

export type User = {
    id: number
    firstname: string
    lastname: string
    email: string
    phone_number?: string | null
    phone_numbers?: UserPhoneNumber[]
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

export type ServiceReviewImage = {
    id: number
    url: string
    sort_order: number
}

export type ServiceReview = {
    id: number
    service_id: number
    rating: number
    title: string | null
    comment: string | null
    status: string
    verified: boolean
    author: string
    created_at: string | null
    images: ServiceReviewImage[]
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
    rating_average: number | null
    reviews_count: number
    created_at: string
    updated_at: string
}

export type ApiEnvelope<T> = {
    success: boolean
    message?: string
    data: T
}

export type BookingStatus = 'pending_payment' | 'confirmed' | 'expired' | 'cancelled'

export type BookingRoom = {
    service_id: number | null
    name: string
    kind: 'room' | 'exclusive'
    adults: number
    kids: number
    weekday_price: string
    weekend_price: string
    line_total: string
    description: string | null
    image_url: string | null
}

export type BookingPayment = {
    reference: string
    provider: string
    method: string
    amount: string
    currency: string
    status: 'pending' | 'paid' | 'expired' | 'cancelled'
    qr_url: string
    qr_expires_at: string | null
    paid_at: string | null
    is_expired: boolean
}

export type CancellationRequest = {
    id: number
    status: 'pending' | 'approved' | 'rejected'
    reason: string
    requested_at: string | null
}

export type Booking = {
    reference: string
    status: BookingStatus
    lifecycle: 'pending' | 'expired' | 'cancelled' | 'booked' | 'completed'
    completed_at: string | null
    check_in: string
    check_out: string
    nights: number
    adults: number
    kids: number
    subtotal: string
    total: string
    currency: string
    payment_method: string | null
    confirmed_at: string | null
    confirmation_email_sent_at: string | null
    contact: {
        name: string
        email: string
        phone: string | null
    }
    rooms: BookingRoom[]
    payment: BookingPayment | null
    cancellation_request: CancellationRequest | null
    created_at: string
}

export type CreateBookingInput = {
    check_in: string
    check_out: string
    rooms: Array<{ service_id: number; adults: number; kids: number }>
    contact_name: string
    contact_email: string
    contact_phone: string
    payment_method: string
}

export type PaymentStatus = {
    reference: string
    booking_reference: string | null
    status: 'pending' | 'paid' | 'expired' | 'cancelled'
    booking_status: BookingStatus | null
    amount: string
    currency: string
    method: string
    qr_url: string
    qr_expires_at: string | null
    paid_at: string | null
    is_expired: boolean
    email_sent: boolean
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
