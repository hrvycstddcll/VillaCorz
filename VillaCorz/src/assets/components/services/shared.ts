import type { Service } from '../../../services/types'
import type { RoomGuests } from '../ui/InteractiveComponents/ServicesFooter'
import { getOfferBadgeLabel, getOfferPricing } from '../../../lib/pricing'

export type StayCategory = 'public' | 'exclusive'
export type BookingRequest = { checkIn: string; checkOut: string; rooms: RoomGuests[] }
export type Stay = {
    id: string
    title: string
    category: StayCategory
    image: string
    gallery: string[]
    price: number
    weekendPrice?: number
    pax?: number | null
    additionalHeadWeekdayPrice?: number
    additionalHeadWeekendPrice?: number
    originalPrice?: number
    weekendOriginalPrice?: number
    discountLabel?: string
    description: string
    amenities: string[]
    capacity: string
    rating?: string
    ratingAverage?: number | null
    reviewsCount?: number
    badge?: string
}
export type ReservationRequest = BookingRequest & { roomChoices: Stay[] }
export type ServicesRouteState = {
    booking?: BookingRequest
    reservation?: ReservationRequest
    reviewServiceId?: number
}

export const exclusiveDefaults = {
    badge: 'Best Value',
    capacity: 'Good for 30-35 pax',
    description:
        'Make the whole beach house yours. Gather in the shared spaces, unwind in comfortable rooms, and enjoy an easygoing seaside stay with your group.',
    amenities: ['TV', 'Private CR', 'Airconditioned', '2 Fans'],
}

export const toStay = (service: Service): Stay => {
    const images = [...(service.images ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
    )
    const primaryImage =
        images.find((image) => image.is_primary)?.image_url ??
        images[0]?.image_url ??
        ''
    const gallery = images.map((image) => image.image_url)
    const weekdayPricing = getOfferPricing(
        Number(service.price),
        service.weekday_discount_type,
        service.weekday_discount_value,
    )
    const weekendBase =
        service.weekend_price != null
            ? Number(service.weekend_price)
            : Number(service.price)
    const weekendPricing = getOfferPricing(
        weekendBase,
        service.weekend_discount_type,
        service.weekend_discount_value,
    )
    const pricing = {
        weekday: weekdayPricing,
        weekend: weekendPricing,
        hasDiscount: weekdayPricing.hasDiscount || weekendPricing.hasDiscount,
    }

    const ratingAverage =
        service.rating_average != null && !Number.isNaN(Number(service.rating_average))
            ? Number(service.rating_average)
            : null

    return {
        id: String(service.id),
        title: service.name,
        category: 'public',
        image: primaryImage,
        gallery: gallery.length > 0 ? gallery : [primaryImage],
        price: pricing.weekday.price,
        weekendPrice: pricing.weekend.price,
        pax: service.pax,
        additionalHeadWeekdayPrice: Number(
            service.additional_head_weekday_price ?? 50,
        ),
        additionalHeadWeekendPrice: Number(
            service.additional_head_weekend_price ?? 100,
        ),
        originalPrice: pricing.weekday.originalPrice ?? undefined,
        weekendOriginalPrice: pricing.weekend.originalPrice ?? undefined,
        discountLabel: getOfferBadgeLabel(pricing) || undefined,
        description:
            service.description?.trim() ||
            'A comfortable room for a relaxed beach-house stay.',
        amenities: service.amenities ?? [],
        capacity:
            service.pax != null
                ? `Good for ${service.pax} pax`
                : 'Good for 2-4 pax',
        rating: ratingAverage != null ? ratingAverage.toFixed(1) : undefined,
        ratingAverage,
        reviewsCount: Number(service.reviews_count ?? 0),
    }
}

export const toExclusiveStay = (service: Service): Stay => {
    const images = [...(service.images ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
    )
    const primaryImage =
        images.find((image) => image.is_primary)?.image_url ??
        images[0]?.image_url ??
        ''
    const gallery =
        images.length > 0
            ? images.map((image) => image.image_url)
            : []
    const weekdayPricing = getOfferPricing(
        Number(service.price),
        service.weekday_discount_type,
        service.weekday_discount_value,
    )
    const weekendBase =
        service.weekend_price != null
            ? Number(service.weekend_price)
            : Number(service.price)
    const weekendPricing = getOfferPricing(
        weekendBase,
        service.weekend_discount_type,
        service.weekend_discount_value,
    )
    const pricing = {
        weekday: weekdayPricing,
        weekend: weekendPricing,
        hasDiscount: weekdayPricing.hasDiscount || weekendPricing.hasDiscount,
    }

    const ratingAverage =
        service.rating_average != null && !Number.isNaN(Number(service.rating_average))
            ? Number(service.rating_average)
            : null

    return {
        id: String(service.id),
        title: service.name,
        category: 'exclusive',
        image: primaryImage,
        gallery,
        price: weekdayPricing.price,
        weekendPrice: weekendPricing.price,
        pax: service.pax,
        additionalHeadWeekdayPrice: Number(
            service.additional_head_weekday_price ?? 50,
        ),
        additionalHeadWeekendPrice: Number(
            service.additional_head_weekend_price ?? 100,
        ),
        originalPrice: weekdayPricing.originalPrice ?? undefined,
        weekendOriginalPrice: weekendPricing.originalPrice ?? undefined,
        discountLabel: getOfferBadgeLabel(pricing) || undefined,
        description:
            service.description?.trim() || exclusiveDefaults.description,
        amenities: service.amenities ?? exclusiveDefaults.amenities,
        capacity:
            service.pax != null
                ? `Good for ${service.pax} pax`
                : exclusiveDefaults.capacity,
        rating: ratingAverage != null ? ratingAverage.toFixed(1) : undefined,
        ratingAverage,
        reviewsCount: Number(service.reviews_count ?? 0),
        badge: exclusiveDefaults.badge,
    }
}

export const dateParts = (value: string) => {
    if (!value) return { day: '--', monthYear: 'Select date', weekday: '' }

    const date = new Date(`${value}T00:00:00`)
    return {
        day: new Intl.DateTimeFormat('en', { day: 'numeric' }).format(date),
        monthYear: new Intl.DateTimeFormat('en', {
            month: 'long',
            year: 'numeric',
        }).format(date),
        weekday: new Intl.DateTimeFormat('en', { weekday: 'long' }).format(date),
    }
}

export type AmenityIcon = 'tv' | 'cr' | 'ac' | 'fan'

export const amenityIcon = (amenity: string): AmenityIcon | null => {
    const value = amenity.toLowerCase()

    if (value.includes('tv') || value.includes('television')) return 'tv'
    if (
        value.includes('cr') ||
        value.includes('bath') ||
        value.includes('toilet')
    ) {
        return 'cr'
    }
    if (value.includes('fan')) return 'fan'
    if (value.includes('air') || value.includes('ac')) return 'ac'

    return null
}
