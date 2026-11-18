import { getServiceReviews, getServices } from './serviceService'
import type { FeaturedTestimonial, Service, ServiceReview } from './types'

export const FEATURED_TESTIMONIAL_LIMIT = 9

const RECENT_MONTHS = 12
const MAX_SERVICES = 12

const toTimestamp = (value: string | null) => {
    if (!value) return null
    const timestamp = Date.parse(value)
    return Number.isFinite(timestamp) ? timestamp : null
}

const getRecentCutoff = (now: Date) => {
    const cutoff = new Date(now)
    cutoff.setMonth(cutoff.getMonth() - RECENT_MONTHS)
    return cutoff.getTime()
}

export const selectFeaturedTestimonials = (
    services: Service[],
    reviewsByService: Map<number, ServiceReview[]>,
    now = new Date(),
): FeaturedTestimonial[] => {
    const serviceNames = new Map(services.map((service) => [service.id, service.name]))
    const cutoff = getRecentCutoff(now)

    return services
        .flatMap((service) => reviewsByService.get(service.id) ?? [])
        .filter((review) => review.status === 'published')
        .filter((review) => Number(review.rating) === 5)
        .filter((review) => review.verified === true)
        .filter((review) => {
            const timestamp = toTimestamp(review.created_at)
            return timestamp !== null && timestamp <= now.getTime() && timestamp >= cutoff
        })
        .map((review) => {
            const quote = review.comment?.trim() || review.title?.trim() || ''

            return {
                id: review.id,
                rating: Number(review.rating),
                title: review.title?.trim() || '',
                quote,
                author: review.author?.trim() || 'Guest',
                serviceName: serviceNames.get(review.service_id) || 'VillaCorz stay',
                createdAt: review.created_at ?? '',
                verified: review.verified,
            }
        })
        .filter((testimonial) => testimonial.quote.length > 0)
        .sort((a, b) => {
            const first = toTimestamp(a.createdAt) ?? 0
            const second = toTimestamp(b.createdAt) ?? 0
            return second - first || b.id - a.id
        })
        .slice(0, FEATURED_TESTIMONIAL_LIMIT)
}

export const loadFeaturedTestimonials = async (): Promise<FeaturedTestimonial[]> => {
    const servicesResponse = await getServices()
    const services = (servicesResponse.data.data ?? [])
        .filter((service) => service.status === 'active' && Number(service.reviews_count) > 0)
        .sort((a, b) => Number(b.reviews_count) - Number(a.reviews_count))
        .slice(0, MAX_SERVICES)

    if (!services.length) return []

    const reviewResults = await Promise.allSettled(
        services.map((service) => getServiceReviews(service.id, 1)),
    )

    const reviewsByService = new Map<number, ServiceReview[]>()
    reviewResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            reviewsByService.set(services[index].id, result.value.data.data ?? [])
        }
    })

    return selectFeaturedTestimonials(services, reviewsByService)
}
