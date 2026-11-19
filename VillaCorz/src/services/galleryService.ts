import { getServiceReviews, getServices } from './serviceService'
import type { GalleryItem, Service, ServiceReview } from './types'

const MAX_SERVICES = 12
const MAX_PAGES_PER_SERVICE = 3

const toTimestamp = (value: string | null) => {
    if (!value) return 0
    const timestamp = Date.parse(value)
    return Number.isFinite(timestamp) ? timestamp : 0
}

export const selectGalleryItems = (
    services: Service[],
    reviewsByService: Map<number, ServiceReview[]>,
): GalleryItem[] => {
    const serviceNames = new Map(services.map((service) => [service.id, service.name]))
    const seen = new Set<string>()

    return services
        .flatMap((service) => reviewsByService.get(service.id) ?? [])
        .filter((review) => review.status === 'published')
        .flatMap((review) =>
            (review.images ?? []).map((image) => ({
                id: `${review.id}-${image.id}`,
                image: image.url,
                title: review.title?.trim() || `Guest photo from ${review.author}`,
                quote: review.comment?.trim() || '',
                author: review.author?.trim() || 'Guest',
                serviceName: serviceNames.get(review.service_id) || 'VillaCorz stay',
                rating: Number(review.rating),
                createdAt: review.created_at ?? '',
            })),
        )
        .filter((item) => {
            if (!item.image || seen.has(item.image)) return false
            seen.add(item.image)
            return true
        })
        .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt) || b.id.localeCompare(a.id))
}

export const loadGalleryImages = async (): Promise<GalleryItem[]> => {
    const servicesResponse = await getServices()
    const services = (servicesResponse.data.data ?? [])
        .filter((service) => service.status === 'active')
        .sort((a, b) => Number(b.reviews_count) - Number(a.reviews_count))
        .slice(0, MAX_SERVICES)

    if (!services.length) return []

    const reviewsByService = new Map<number, ServiceReview[]>()
    const firstPageResults = await Promise.allSettled(
        services.map((service) => getServiceReviews(service.id, 1)),
    )

    const extraTasks: { serviceId: number; page: number }[] = []

    firstPageResults.forEach((result, index) => {
        const serviceId = services[index].id
        if (result.status !== 'fulfilled') return

        reviewsByService.set(serviceId, result.value.data.data ?? [])
        const lastPage = Math.min(
            result.value.data.meta?.last_page ?? 1,
            MAX_PAGES_PER_SERVICE,
        )

        for (let page = 2; page <= lastPage; page++) {
            extraTasks.push({ serviceId, page })
        }
    })

    if (extraTasks.length) {
        const extraResults = await Promise.allSettled(
            extraTasks.map((task) => getServiceReviews(task.serviceId, task.page)),
        )

        extraResults.forEach((result, index) => {
            if (result.status !== 'fulfilled') return
            const serviceId = extraTasks[index].serviceId
            reviewsByService.set(serviceId, [
                ...(reviewsByService.get(serviceId) ?? []),
                ...(result.value.data.data ?? []),
            ])
        })
    }

    return selectGalleryItems(services, reviewsByService)
}
