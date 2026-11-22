import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServiceReviews, getServices } from '../services/serviceService'
import { loadGalleryImages, selectGalleryItems } from '../services/galleryService'
import type { Service, ServiceReview } from '../services/types'

vi.mock('../services/serviceService', () => ({
    getServices: vi.fn(),
    getServiceReviews: vi.fn(),
}))

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
    created_at: '2026-11-10T00:00:00.000Z',
    images: [],
    ...overrides,
})

describe('galleryService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('selects unique published review images and sorts them newest first', () => {
        const services = [makeService(1), makeService(2)]
        const reviewsByService = new Map<number, ServiceReview[]>([
            [
                1,
                [
                    makeReview(1, 1, {
                        created_at: '2026-10-01T00:00:00.000Z',
                        images: [{ id: 1, url: 'https://cdn.test/older.jpg', sort_order: 0 }],
                    }),
                    makeReview(2, 1, {
                        status: 'hidden',
                        images: [{ id: 2, url: 'https://cdn.test/hidden.jpg', sort_order: 0 }],
                    }),
                ],
            ],
            [
                2,
                [
                    makeReview(3, 2, {
                        title: 'Sunrise view',
                        created_at: '2026-11-10T00:00:00.000Z',
                        images: [
                            { id: 3, url: 'https://cdn.test/newer.jpg', sort_order: 0 },
                            { id: 4, url: 'https://cdn.test/older.jpg', sort_order: 1 },
                        ],
                    }),
                ],
            ],
        ])

        const result = selectGalleryItems(services, reviewsByService)

        expect(result.map((item) => item.image)).toEqual([
            'https://cdn.test/newer.jpg',
            'https://cdn.test/older.jpg',
        ])
        expect(result[0]).toMatchObject({
            id: '3-3',
            title: 'Sunrise view',
            author: 'Guest 3',
            serviceName: 'Service 2',
        })
    })

    it('loads active services and paginated reviews from the public endpoints', async () => {
        vi.mocked(getServices).mockResolvedValue({
            data: {
                success: true,
                data: [
                    makeService(1, { reviews_count: 10 }),
                    makeService(2, { status: 'inactive', reviews_count: 99 }),
                    makeService(3, { reviews_count: 2 }),
                ],
                meta: { current_page: 1, last_page: 1, per_page: 15, total: 3 },
            },
        } as never)

        vi.mocked(getServiceReviews).mockImplementation((id: number, page = 1) =>
            Promise.resolve({
                data: {
                    success: true,
                    data:
                        id === 1 && page === 1
                            ? [
                                  makeReview(1, 1, {
                                      created_at: '2026-10-01T00:00:00.000Z',
                                      images: [
                                          {
                                              id: 1,
                                              url: 'https://cdn.test/one.jpg',
                                              sort_order: 0,
                                          },
                                      ],
                                  }),
                              ]
                            : id === 1 && page === 2
                              ? [
                                    makeReview(2, 1, {
                                        created_at: '2026-11-01T00:00:00.000Z',
                                        images: [
                                            {
                                                id: 2,
                                                url: 'https://cdn.test/two.jpg',
                                                sort_order: 0,
                                            },
                                        ],
                                    }),
                                ]
                              : [],
                    meta: { current_page: page, last_page: id === 1 ? 2 : 1, total: 2, average_rating: 5 },
                },
            } as never),
        )

        const result = await loadGalleryImages()

        expect(getServiceReviews).toHaveBeenCalledWith(1, 1)
        expect(getServiceReviews).toHaveBeenCalledWith(3, 1)
        expect(getServiceReviews).toHaveBeenCalledWith(1, 2)
        expect(getServiceReviews).not.toHaveBeenCalledWith(2, 1)
        expect(result.map((item) => item.image)).toEqual([
            'https://cdn.test/two.jpg',
            'https://cdn.test/one.jpg',
        ])
    })
})
