import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
import fromSeaImg from '../../images/fromsea.png'
import wholeVillaImg from '../../images/wholevilla2.png'
import room1Img from '../../images/room1.png'

type Panel = {
    label: string
    headline: string
    body: string
    bg: string
    image: string
}

const panels: Panel[] = [
    {
        label: '01. From the sea',
        headline: 'Wake up to the gentle sound of waves and golden Lian sunsets just steps from your door.',
        body: 'Just a 2-minute stroll brings you straight to the Matabungkay beach of Lian, Batangas—ideal for sunrise walks, afternoon dips, and unhurried sunset views.',
        bg: '#8AB4F8',
        image: fromSeaImg,
    },
    {
        label: '02. The Villa',
        headline: 'Unwind in an exclusive coastal home designed for slow mornings and effortless family gatherings.',
        body: 'Relax in clean, 100% air-conditioned rooms, spacious dining and lounge spaces, and an intimate setting built for togetherness.',
        bg: '#1A73E8',
        image: wholeVillaImg,
    },
    {
        label: '03. Flexible room setups',
        headline: 'Choose rooms with TV & CR or spacious barkada rooms',
        body: 'Book individual rooms for smaller groups with 20% off on weekdays, or reserve all 5 air-conditioned rooms together for an exclusive 30–35 guest retreat.',
        bg: '#0052CC',
        image: room1Img,
    },
]

type AccordionGalleryProps = {
    height?: number | string
    gap?: number
    radius?: number
    tilt?: number
    grayscale?: boolean
    expandRatio?: number
    trigger?: 'click' | 'hover'
}

const MOBILE_QUERY = '(max-width: 767px)'
const DESKTOP_COLLAPSED = 56
const MOBILE_COLLAPSED = 64

const initialMobileState = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(MOBILE_QUERY).matches

const AccordionGallery = ({
    height = '100vh',
    gap = 0,
    radius = 0,
    tilt = 0,
    grayscale = false,
    trigger = 'click',
}: AccordionGalleryProps) => {
    const sectionRef = useRef<HTMLElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const panelRefs = useRef<(HTMLDivElement | null)[]>([])
    const imgRefs = useRef<(HTMLImageElement | null)[]>([])
    const contentRefs = useRef<(HTMLDivElement | null)[]>([])
    const scrollTriggerRef = useRef<ScrollTrigger | null>(null)
    const [active, setActive] = useState(0)
    const [isMobile, setIsMobile] = useState(initialMobileState)

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return

        const query = window.matchMedia(MOBILE_QUERY)
        const handleChange = (event: MediaQueryListEvent) =>
            setIsMobile(event.matches)

        query.addEventListener('change', handleChange)

        return () => query.removeEventListener('change', handleChange)
    }, [])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const updateSizes = () => {
            const count = panels.length
            const totalGap = gap * (count - 1)

            if (isMobile) {
                const total = container.clientHeight
                const collapsedTotal = (count - 1) * MOBILE_COLLAPSED
                const expanded = Math.max(
                    MOBILE_COLLAPSED,
                    total - totalGap - collapsedTotal,
                )

                panelRefs.current.forEach((panel, index) => {
                    if (!panel) return
                    gsap.killTweensOf(panel)
                    gsap.set(panel, { width: '100%' })
                    gsap.to(panel, {
                        height:
                            index === active ? expanded : MOBILE_COLLAPSED,
                        duration: 0.55,
                        ease: 'power3.out',
                    })
                })
                return
            }

            const total = container.clientWidth
            const collapsedTotal = (count - 1) * DESKTOP_COLLAPSED
            const expanded = Math.max(
                DESKTOP_COLLAPSED,
                total - totalGap - collapsedTotal,
            )

            panelRefs.current.forEach((panel, index) => {
                if (!panel) return
                gsap.killTweensOf(panel)
                gsap.set(panel, { height: '100%' })
                gsap.to(panel, {
                    width:
                        index === active ? expanded : DESKTOP_COLLAPSED,
                    duration: 0.65,
                    ease: 'power3.out',
                })
            })
        }

        updateSizes()
        window.addEventListener('resize', updateSizes)

        const observer =
            typeof ResizeObserver === 'function'
                ? new ResizeObserver(updateSizes)
                : null
        observer?.observe(container)
        const panelElements = panelRefs.current

        return () => {
            observer?.disconnect()
            window.removeEventListener('resize', updateSizes)
            panelElements.forEach((panel) => {
                if (panel) gsap.killTweensOf(panel)
            })
        }
    }, [active, gap, isMobile])

    useEffect(() => {
        contentRefs.current.forEach((el, i) => {
            if (!el) return
            if (i === active) {
                gsap.fromTo(
                    el,
                    { opacity: 0, y: 24 },
                    { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
                )
            } else {
                gsap.to(el, { opacity: 0, y: 24, duration: 0.3, ease: 'power2.out' })
            }
        })
    }, [active])

    useEffect(() => {
        imgRefs.current.forEach((img, i) => {
            if (!img) return
            gsap.killTweensOf(img)
            if (i === active) {
                gsap.fromTo(
                    img,
                    { x: -12, scale: 1.05 },
                    {
                        x: 12,
                        duration: 4,
                        ease: 'sine.inOut',
                        yoyo: true,
                        repeat: -1,
                    },
                )
            } else {
                gsap.to(img, { x: 0, scale: 1, duration: 0.6, ease: 'power2.out' })
            }
        })
    }, [active])

    useEffect(() => {
        const section = sectionRef.current
        if (!section) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        const st = ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            end: () => '+=' + window.innerHeight * 2.5,
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
                const idx = Math.min(
                    panels.length - 1,
                    Math.floor(self.progress * panels.length),
                )
                setActive(idx)
            },
        })
        scrollTriggerRef.current = st

        return () => {
            st.kill()
            scrollTriggerRef.current = null
        }
    }, [isMobile])

    const handleActivate = (i: number) => {
        const st = scrollTriggerRef.current
        if (st) {
            const total = window.innerHeight * 2.5
            const targetProgress = (i + 0.5) / panels.length
            const targetScroll = st.start + total * targetProgress
            window.scrollTo({ top: targetScroll, behavior: 'smooth' })
        }
        setActive(i)
    }

    const sectionHeight = isMobile ? '100svh' : height
    const sectionMinHeight = isMobile ? '100svh' : '100vh'

    return (
        <section
            ref={sectionRef}
            className="w-full"
            style={{
                height: sectionHeight,
                minHeight: sectionMinHeight,
                marginBottom: 0,
                paddingBottom: 0,
            }}
        >
            <div
                ref={containerRef}
                className="ag-container flex w-full flex-col overflow-hidden md:flex-row"
                style={{
                    height: '100%',
                    minHeight: sectionMinHeight,
                    gap,
                    borderRadius: radius,
                    marginBottom: 0,
                    paddingBottom: 0,
                }}
            >
                {panels.map((p, i) => {
                    const isOpen = i === active
                    return (
                        <div
                            key={p.label}
                            ref={(el) => {
                                panelRefs.current[i] = el
                            }}
                            role="button"
                            tabIndex={0}
                            aria-expanded={isOpen}
                            aria-label={p.label}
                            className="ag-panel relative w-full shrink-0 cursor-pointer overflow-hidden outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white md:w-auto"
                            style={{
                                width: isMobile ? '100%' : 0,
                                height: isMobile ? MOBILE_COLLAPSED : '100%',
                                borderRadius: radius,
                                background: p.bg,
                                transform: tilt
                                    ? `perspective(1000px) rotateY(${tilt}deg)`
                                    : undefined,
                            }}
                            onClick={
                                trigger === 'click'
                                    ? () => handleActivate(i)
                                    : undefined
                            }
                            onMouseEnter={
                                trigger === 'hover'
                                    ? () => handleActivate(i)
                                    : undefined
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key !== 'Enter' &&
                                    event.key !== ' '
                                ) {
                                    return
                                }
                                event.preventDefault()
                                handleActivate(i)
                            }}
                        >
                            <div
                                aria-hidden="true"
                                className="absolute left-0 top-0 z-20 flex h-14 w-full items-center justify-center md:h-full md:w-14 md:items-start md:justify-center md:pt-7"
                                style={{ background: p.bg }}
                            >
                                <span
                                    className="text-xs font-semibold tracking-wide text-white [text-orientation:mixed] [writing-mode:horizontal-tb] md:text-sm md:[writing-mode:vertical-rl]"
                                    style={{
                                        fontFamily:
                                            '"Helvetica World", Helvetica, Arial, sans-serif',
                                    }}
                                >
                                    {p.label}
                                </span>
                            </div>

                            <div
                                aria-hidden={!isOpen}
                                className={`absolute inset-0 flex flex-col pt-14 transition-opacity duration-300 md:flex-row md:items-stretch md:pt-0 ${
                                    isOpen
                                        ? 'opacity-100'
                                        : 'pointer-events-none opacity-0'
                                }`}
                            >
                                <div
                                    ref={(el) => {
                                        contentRefs.current[i] = el
                                    }}
                                    className="flex w-full flex-none flex-col justify-center px-5 py-5 transition-all duration-500 ease-out md:w-1/2 md:py-10 md:pl-20 md:pr-12"
                                    style={{ background: p.bg }}
                                >
                                    <h3
                                        className="mb-4 text-white"
                                        style={{
                                            fontFamily:
                                                '"Instrument Serif", serif',
                                            fontSize:
                                                'clamp(1.5rem, 6vw, 2.5rem)',
                                            letterSpacing: '-0.03em',
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        {p.headline}
                                    </h3>
                                    <p
                                        className="text-sm leading-relaxed text-white md:text-base"
                                        style={{
                                            fontFamily:
                                                '"Helvetica World", Helvetica, Arial, sans-serif',
                                        }}
                                    >
                                        {p.body}
                                    </p>
                                </div>
                                <div className="relative min-h-0 flex-1 overflow-hidden md:h-full md:w-1/2 md:flex-none">
                                    <img
                                        ref={(el) => {
                                            imgRefs.current[i] = el
                                        }}
                                        src={p.image}
                                        alt={p.label}
                                        className="h-full w-full object-cover transition-transform duration-700 ease-out"
                                        style={{
                                            objectFit: 'cover',
                                            transform: isOpen
                                                ? 'scale(1)'
                                                : 'scale(1.05)',
                                            filter:
                                                !isOpen && grayscale
                                                    ? 'grayscale(100%)'
                                                    : 'none',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

export default AccordionGallery
