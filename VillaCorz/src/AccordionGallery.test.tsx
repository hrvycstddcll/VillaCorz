import { act, fireEvent, render, screen } from '@testing-library/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import AccordionGallery from './assets/components/ui/AccordionGallery'

vi.mock('gsap', () => ({
    default: {
        killTweensOf: vi.fn(),
        set: vi.fn(),
        to: vi.fn(),
        fromTo: vi.fn(),
        registerPlugin: vi.fn(),
    },
}))

vi.mock('gsap/ScrollTrigger', () => ({
    ScrollTrigger: {
        create: vi.fn(() => ({ kill: vi.fn(), start: 0 })),
    },
}))

const originalMatchMedia = window.matchMedia

const setMobileViewport = () => {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: query === '(max-width: 767px)',
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    setMobileViewport()
    window.scrollTo = vi.fn()
})

afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
    })
})

it('uses desktop-style scroll and tap activation on mobile', () => {
    render(<AccordionGallery />)

    const first = screen.getByRole('button', { name: '01. From the sea' })
    const second = screen.getByRole('button', { name: '02. The Villa' })
    const third = screen.getByRole('button', {
        name: '03. Flexible room setups',
    })

    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(second).toHaveAttribute('aria-expanded', 'false')
    expect(first).toHaveClass('w-full')
    expect(first.parentElement).toHaveClass('flex-col')
    expect(ScrollTrigger.create).toHaveBeenCalledWith(
        expect.objectContaining({
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
        }),
    )

    fireEvent.click(second)

    expect(second).toHaveAttribute('aria-expanded', 'true')
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(window.scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: 'smooth' }),
    )

    fireEvent.keyDown(first, { key: 'Enter' })

    expect(first).toHaveAttribute('aria-expanded', 'true')

    const config = vi.mocked(ScrollTrigger.create).mock.calls[0][0] as {
        onUpdate?: (self: { progress: number }) => void
    }
    act(() => config.onUpdate?.({ progress: 0.7 }))

    expect(third).toHaveAttribute('aria-expanded', 'true')
})
