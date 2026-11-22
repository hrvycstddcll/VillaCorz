import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import FlexCarousel from './assets/components/ui/CssComponents/FlexCarousel'
import type { FlexCarouselItem } from './assets/components/ui/CssComponents/FlexCarousel'

const testimonial: FlexCarouselItem = {
    src: 'data:image/svg+xml,test',
    alt: '5-star guest review from Guest 1',
    title: 'Excellent stay',
    subtitle: 'Ocean Suite · Oct 10, 2026',
    quote: 'Guest review number 1',
    author: 'Guest 1',
    service: 'Ocean Suite',
    rating: 5,
}

describe('FlexCarousel', () => {
    it('renders readable cards in forced fallback mode', () => {
        render(
            <FlexCarousel
                forceFallback
                items={[testimonial]}
                ariaLabel="Guest testimonials"
            />,
        )

        const carousel = screen.getByRole('region', { name: 'Guest testimonials' })
        expect(carousel).toHaveAttribute('aria-roledescription', 'carousel')
        expect(carousel).toHaveAttribute('tabindex', '0')
        expect(screen.getByRole('group', { name: '1 of 1' })).toBeInTheDocument()
        expect(screen.getByText('Excellent stay')).toBeInTheDocument()
        expect(screen.getByText('Guest review number 1')).toBeInTheDocument()
        expect(screen.getByText('Guest 1')).toBeInTheDocument()
        expect(screen.getByText('Ocean Suite · Oct 10, 2026')).toBeInTheDocument()
    })
})
