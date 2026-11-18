import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Testimonials from './assets/components/pages/Testimonials'
import { loadFeaturedTestimonials } from './services/testimonialsService'
import type { FeaturedTestimonial } from './services/types'

const carouselControls = vi.hoisted(() => ({
    next: vi.fn(),
    previous: vi.fn(),
    goTo: vi.fn(),
}))

type MockCarouselRef =
    | ((handle: typeof carouselControls) => void)
    | { current: typeof carouselControls | null }
    | null

vi.mock('./services/testimonialsService', () => ({
    loadFeaturedTestimonials: vi.fn(),
}))

vi.mock('./assets/components/ui/CssComponents/FlexCarousel', () => ({
    default: ({
        items,
        onChange,
        ref,
    }: {
        items: unknown[]
        onChange?: (index: number) => void
        ref?: MockCarouselRef
    }) => {
        if (typeof ref === 'function') ref(carouselControls)
        else if (ref) ref.current = carouselControls

        return (
            <div data-testid="carousel">
                {items.length}
                <button
                    type="button"
                    data-testid="select-second"
                    onClick={() => onChange?.(1)}
                >
                    select second
                </button>
            </div>
        )
    },
}))

const makeTestimonial = (id: number): FeaturedTestimonial => ({
    id,
    rating: 5,
    title: 'Excellent stay',
    quote: `Guest review number ${id}`,
    author: `Guest ${id}`,
    serviceName: 'Ocean Suite',
    createdAt: '2026-10-10T00:00:00.000Z',
    verified: true,
})

describe('Testimonials', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the carousel and a screen-reader list with real reviews', async () => {
        vi.mocked(loadFeaturedTestimonials).mockResolvedValue([
            makeTestimonial(1),
            makeTestimonial(2),
        ])

        render(<Testimonials />)

        expect(
            screen.getByRole('heading', { name: /words from our guests/i }),
        ).toBeInTheDocument()
        expect(await screen.findByTestId('carousel')).toHaveTextContent('2')
        expect(screen.getByText(/Guest review number 1/)).toBeInTheDocument()
    })

    it('renders controls that drive the carousel and track the active slide', async () => {
        vi.mocked(loadFeaturedTestimonials).mockResolvedValue([
            makeTestimonial(1),
            makeTestimonial(2),
        ])

        render(<Testimonials />)

        await screen.findByTestId('carousel')

        fireEvent.click(screen.getByRole('button', { name: 'Previous testimonial' }))
        expect(carouselControls.previous).toHaveBeenCalledTimes(1)

        fireEvent.click(screen.getByRole('button', { name: 'Next testimonial' }))
        expect(carouselControls.next).toHaveBeenCalledTimes(1)

        expect(screen.getAllByRole('button', { name: /Show testimonial/ })).toHaveLength(2)
        expect(screen.getByRole('button', { name: 'Show testimonial 1' })).toHaveAttribute(
            'aria-current',
            'true',
        )

        fireEvent.click(screen.getByRole('button', { name: 'Show testimonial 2' }))
        expect(carouselControls.goTo).toHaveBeenCalledWith(1)

        fireEvent.click(screen.getByTestId('select-second'))
        expect(screen.getByRole('button', { name: 'Show testimonial 2' })).toHaveAttribute(
            'aria-current',
            'true',
        )
    })

    it('renders the empty state when there are no qualifying reviews', async () => {
        vi.mocked(loadFeaturedTestimonials).mockResolvedValue([])

        render(<Testimonials />)

        expect(await screen.findByText(/guest stories will appear here/i)).toBeInTheDocument()
        expect(screen.queryByTestId('carousel')).not.toBeInTheDocument()
    })

    it('shows an error state and retries loading', async () => {
        vi.mocked(loadFeaturedTestimonials)
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce([])

        render(<Testimonials />)

        expect(await screen.findByText(/stories are unavailable/i)).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: /try again/i }))

        await waitFor(() => expect(loadFeaturedTestimonials).toHaveBeenCalledTimes(2))
        expect(await screen.findByText(/guest stories will appear here/i)).toBeInTheDocument()
    })
})
