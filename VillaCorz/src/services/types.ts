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
    user_id: number | null
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
    rating_average: number | string | null
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

export type DashboardMetrics = {
    revenue: number
    paid_count: number
    check_ins: number
    new_bookings: number
    new_users: number
    website_visits: number
}

export type DashboardSeriesPoint = {
    date: string
    bookings: number
    revenue: number
    visits: number
}

export type DashboardRecentBooking = {
    reference: string
    guest: string
    email: string
    stay: string[]
    status: string
    lifecycle: string
    total: number
    currency: string
    payment_status: string | null
    created_at: string | null
    check_in: string | null
    check_out: string | null
}

export type DashboardComparison = {
    revenue: { current: number; previous: number; delta: number; percent: number | null }
    check_ins: { current: number; previous: number; delta: number; percent: number | null }
    new_bookings: { current: number; previous: number; delta: number; percent: number | null }
    new_users: { current: number; previous: number; delta: number; percent: number | null }
    website_visits: { current: number; previous: number; delta: number; percent: number | null }
}

export type DashboardTopService = {
    service_id: number
    name: string
    bookings: number
    revenue: number
}

export type DashboardSummary = {
    range: number
    start: string
    end: string
    metrics: DashboardMetrics
    comparison: DashboardComparison
    series: DashboardSeriesPoint[]
    top_services: DashboardTopService[]
    recent_bookings: DashboardRecentBooking[]
    action_center: {
        pending_cancellations: number
        unpublished_reviews: number
        expired_payments: number
        contact_messages: number
    }
    revenue_by_weekday: number[]
    offer_metrics: Array<{
        service_id: number
        name: string
        bookings: number
        revenue: number
        occupancy: number
        rating: number
    }>
    availability: Record<string, Array<{ check_in: string; check_out: string }>>
    operational: {
        occupancy: number
        adr: number
        revpar: number
        booked_forward_revenue: number
    }
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

export type AdminReportKind =
    | 'revenue'
    | 'bookings'
    | 'cancellations'
    | 'reviews'
    | 'contacts'
    | 'payments'
    | 'guests'
    | 'traffic'

export type AdminReportRow = {
    id: number
    reference: string
    date: string | null
    label: string
    detail: string
    status: string
    amount: number | null
}

export type AdminReportResponse = {
    success: boolean
    data: AdminReportRow[]
    meta: {
        current_page: number
        last_page: number
        total: number
        from: number | null
        to: number | null
    }
    summary: {
        total: number
        amount: number
    }
}

export type AdminReportSchedule = {
    id: number
    email: string
    report: Exclude<AdminReportKind, 'activity'>
    frequency: 'weekly' | 'monthly'
    next_run_at: string
}
