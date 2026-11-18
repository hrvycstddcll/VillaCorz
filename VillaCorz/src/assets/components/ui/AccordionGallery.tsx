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

const AccordionGallery = ({
    height = '100vh',
    gap = 0,
    radius = 0,
    tilt = 0,
    grayscale = false,
    expandRatio = 0.82,
    trigger = 'click',
}: AccordionGalleryProps) => {
    const sectionRef = useRef<HTMLElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const panelRefs = useRef<(HTMLDivElement | null)[]>([])
    const imgRefs = useRef<(HTMLImageElement | null)[]>([])
    const contentRefs = useRef<(HTMLDivElement | null)[]>([])
    const scrollTriggerRef = useRef<ScrollTrigger | null>(null)
    const [active, setActive] = useState(0)

    const COLLAPSED = 56

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const n = panels.length
        const total = container.offsetWidth
        const totalGap = gap * (n - 1)
        const available = total - totalGap
        const collapsedTotal = (n - 1) * COLLAPSED
        const expanded = available - collapsedTotal

        panelRefs.current.forEach((panel, i) => {
            if (!panel) return
            gsap.to(panel, {
                width: i === active ? expanded : COLLAPSED,
                duration: 0.65,
                ease: 'power3.out',
            })
        })
    }, [active, gap, expandRatio])

    // fade/slide text in via GSAP when active changes
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

    // subtle parallax drift on the active image
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

    // scroll-driven pin + scrub sequence
    useEffect(() => {
        const section = sectionRef.current
        if (!section) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        const distance = window.innerHeight * 2.5
        const st = ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            end: () => '+=' + distance,
            pin: true,
            scrub: 0.6,
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
    }, [])

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

    return (
        <section
            ref={sectionRef}
            className="w-full"
            style={{ height, minHeight: '100vh', marginBottom: 0, paddingBottom: 0 }}
        >
            <div
                ref={containerRef}
                className="ag-container flex w-full overflow-hidden"
                style={{ height: '100%', minHeight: '100vh', gap, borderRadius: radius, marginBottom: 0, paddingBottom: 0 }}
            >
            {panels.map((p, i) => {
                const isOpen = i === active
                return (
                    <div
                        key={p.label}
                        ref={(el) => {
                            panelRefs.current[i] = el
                        }}
                        className="ag-panel relative shrink-0 overflow-hidden cursor-pointer"
                        style={{
                            width: 0,
                            height: '100%',
                            borderRadius: radius,
                            background: p.bg,
                            transform: tilt ? `perspective(1000px) rotateY(${tilt}deg)` : undefined,
                        }}
                        onClick={trigger === 'click' ? () => handleActivate(i) : undefined}
                        onMouseEnter={trigger === 'hover' ? () => handleActivate(i) : undefined}
                    >
                        {/* vertical side rail (always visible) */}
                        <div
                            className="absolute left-0 top-0 z-20 h-full w-14"
                            style={{ background: p.bg }}
                        >
                            <span
                                className="absolute text-white text-sm font-semibold tracking-wide"
                                style={{
                                    top: '28px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'mixed',
                                    fontFamily: '"Helvetica World", Helvetica, Arial, sans-serif',
                                }}
                            >
                                {p.label}
                            </span>
                        </div>

                        {/* expanded split content */}
                        <div
                            className={`absolute inset-0 flex flex-row items-stretch transition-opacity duration-300 ${
                                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                        >
                            <div
                                ref={(el) => {
                                    contentRefs.current[i] = el
                                }}
                                className="flex flex-col justify-center py-10 pl-16 pr-8"
                                style={{ width: '38%', maxWidth: '440px', height: '100%', background: p.bg }}
                            >
                                <h3
                                    className="text-white mb-4"
                                    style={{
                                        fontFamily: '"Instrument Serif", serif',
                                        fontSize: 'clamp(1.75rem, 2.5vw, 2.5rem)',
                                        letterSpacing: '-0.03em',
                                        lineHeight: 1.1,
                                    }}
                                >
                                    {p.headline}
                                </h3>
                                <p
                                    className="text-white text-sm md:text-base leading-relaxed"
                                    style={{ fontFamily: '"Helvetica World", Helvetica, Arial, sans-serif' }}
                                >
                                    {p.body}
                                </p>
                            </div>
                            <div
                                className="relative overflow-hidden"
                                style={{
                                    flex: 1,
                                    height: '100%',
                                    marginTop: 0,
                                    paddingTop: 0,
                                    top: 0,
                                    alignSelf: 'stretch',
                                }}
                            >
                                <img
                                    ref={(el) => {
                                        imgRefs.current[i] = el
                                    }}
                                    src={p.image}
                                    alt={p.label}
                                    className="h-full w-full object-cover"
                                    style={{
                                        marginTop: 0,
                                        paddingTop: 0,
                                        top: 0,
                                        height: '100%',
                                        objectFit: 'cover',
                                        filter: !isOpen && grayscale ? 'grayscale(100%)' : 'none',
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