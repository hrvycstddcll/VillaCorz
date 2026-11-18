import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getServiceReviews, getServices } from './services/serviceService'
import {
    FEATURED_TESTIMONIAL_LIMIT,
    loadFeaturedTestimonials,
    selectFeaturedTestimonials,
} from './services/testimonialsService'
import type { Service, ServiceReview } from './services/types'

vi.mock('./services/serviceService', () => ({
    getServices: vi.fn(),
    getServiceReviews: vi.fn(),
}))

const now = new Date('2026-11-18T12:00:00.000Z')

const recent = (daysAgo: number) =>
    new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

const makeService = (id: number, overrides: Partial<Service> = {}): Service =>
    ({
        id,
        name: `Service ${id}`,
        status: 'active',
        reviews_count: 10,
        ...overrides,
    }) as Service

const makeReview = (
    id: number,
    serviceId: number,
    overrides: Partial<ServiceReview> = {},
): ServiceReview => ({
    id,
    service_id: serviceId,
    user_id: 1,
    rating: 5,
    title: 'Wonderful stay',
    comment: 'A peaceful stay by the sea.',
    status: 'published',
    verified: true,
    author: `Guest ${id}`,
    created_at: recent(10 + id),
    images: [],
    ...overrides,
})

describe('testimonialsService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        vi.setSystemTime(now)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('selects only recent verified five-star published reviews and sorts newest first', () => {
        const services = [makeService(1), makeService(2)]
        const reviewsByService = new Map<number, ServiceReview[]>([
            [
                1,
                [
                    makeReview(1, 1, { created_at: recent(40) }),
                    makeReview(2, 1, { rating: 4 }),
                    makeReview(3, 1, { verified: false }),
                    makeReview(4, 1, { status: 'hidden' }),
                    makeReview(5, 1, { created_at: recent(500) }),
                ],
            ],
            [
                2,
                [
                    makeReview(6, 2, { created_at: recent(3), comment: '', title: 'Quiet and clean' }),
                    makeReview(7, 2, { created_at: recent(20), author: 'Ana' }),
                ],
            ],
        ])

        const result = selectFeaturedTestimonials(services, reviewsByService, now)

        expect(result.map((item) => item.id)).toEqual([6, 7, 1])
        expect(result[0]).toMatchObject({
            author: 'Guest 6',
            serviceName: 'Service 2',
            quote: 'Quiet and clean',
            rating: 5,
        })
        expect(result[1]).toMatchObject({
            author: 'Ana',
            serviceName: 'Service 2',
            quote: 'A peaceful stay by the sea.',
        })
    })

    it('caps the featured testimonials at nine', () => {
        const services = [makeService(1)]
        const reviews = Array.from({ length: FEATURED_TESTIMONIAL_LIMIT + 4 }, (_, index) =>
            makeReview(index + 1, 1, { created_at: recent(index + 1) }),
        )

        const result = selectFeaturedTestimonials(
            services,
            new Map([[1, reviews]]),
            now,
        )

        expect(result).toHaveLength(FEATURED_TESTIMONIAL_LIMIT)
        expect(result[0].id).toBe(1)
    })

    it('loads reviews for active services only and tolerates a failed review request', async () => {
        vi.mocked(getServices).mockResolvedValue({
            data: {
                success: true,
                data: [makeService(1), makeService(2), makeService(3, { status: 'inactive' })],
            },
        } as never)

        vi.mocked(getServiceReviews)
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    data: [makeReview(11, 1, { created_at: recent(8) })],
                    meta: {
                        current_page: 1,
                        last_page: 1,
                        total: 1,
                        average_rating: 5,
                        reviews_count: 1,
                    },
                },
            } as never)
            .mockRejectedValueOnce(new Error('offline'))

        const result = await loadFeaturedTestimonials()

        expect(getServiceReviews).toHaveBeenCalledTimes(2)
        expect(result).toHaveLength(1)
        expect(result[0].serviceName).toBe('Service 1')
    })
})
