import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import fromSeaImg from '../images/fromsea.png'
import wholeVillaImg from '../images/wholevilla2.png'
import room1Img from '../images/room1.png'

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
        headline: 'Wake up to the gentle sound of waves',
        body: 'Golden Lian sunsets just steps from your door. Stroll along Matabungkay beach and watch the sky melt into the sea from your private balsa at dusk.',
        bg: '#89B4F8',
        image: fromSeaImg,
    },
    {
        label: '02. The Villa',
        headline: 'Unwind in an exclusive coastal home',
        body: 'Designed for slow mornings and effortless family gatherings. 100% air-conditioned rooms and an open dining pavilion bring everyone together by the sea.',
        bg: '#1877F2',
        image: wholeVillaImg,
    },
    {
        label: '03. Flexible room setups',
        headline: 'Choose rooms your way',
        body: 'Rooms with TV & CR or spacious barkada rooms. Enjoy 20% off on weekdays and host up to 30–35 guests in a bamboo bunk room retreat.',
        bg: '#0057D9',
        image: room1Img,
    },
]

const COLLAPSED = 56
const MOBILE_EXPANDED = 420

const SplitPanelAccordion = () => {
    const containerRef = useRef<HTMLDivElement>(null)
    const panelRefs = useRef<(HTMLDivElement | null)[]>([])
    const imgRefs = useRef<(HTMLImageElement | null)[]>([])
    const [active, setActive] = useState(0)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const n = panels.length

        if (isMobile) {
            panelRefs.current.forEach((panel, i) => {
                if (!panel) return
                gsap.to(panel, {
                    height: i === active ? MOBILE_EXPANDED : COLLAPSED,
                    duration: 0.6,
                    ease: 'power3.out',
                })
            })
        } else {
            const total = container.offsetWidth
            const expanded = total - (n - 1) * COLLAPSED
            panelRefs.current.forEach((panel, i) => {
                if (!panel) return
                gsap.to(panel, {
                    width: i === active ? expanded : COLLAPSED,
                    duration: 0.6,
                    ease: 'power3.out',
                })
            })
        }
    }, [active, isMobile])

    // subtle parallax drift on resize
    useEffect(() => {
        const onResize = () => {
            imgRefs.current.forEach((img) => {
                if (!img) return
                gsap.fromTo(
                    img,
                    { x: -6 },
                    { x: 6, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: 1 },
                )
            })
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    return (
        <div
            ref={containerRef}
            className={`flex ${isMobile ? 'flex-col' : 'flex-row'} w-full overflow-hidden`}
            style={{ height: isMobile ? 'auto' : 520, gap: 0, borderRadius: 0 }}
        >
            {panels.map((p, i) => {
                const isOpen = i === active
                return (
                    <div
                        key={p.label}
                        ref={(el) => {
                            panelRefs.current[i] = el
                        }}
                        onClick={() => setActive(i)}
                        onMouseEnter={() => setActive(i)}
                        className="relative shrink-0 overflow-hidden cursor-pointer"
                        style={{
                            width: isMobile ? '100%' : COLLAPSED,
                            height: isMobile ? COLLAPSED : 520,
                        }}
                    >
                        {/* collapsed rail */}
                        <div
                            className={`absolute inset-0 flex items-start justify-center pt-4 ${
                                isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                            } transition-opacity duration-300`}
                            style={{ background: p.bg }}
                        >
                            <span
                                className="text-white text-sm font-semibold tracking-wide"
                                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            >
                                {p.label}
                            </span>
                        </div>

                        {/* expanded split panel */}
                        <div
                            className={`absolute inset-0 flex ${
                                isMobile ? 'flex-col' : 'flex-row'
                            } ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}
                        >
                            {/* left half editorial */}
                            <div
                                className="flex flex-col justify-center px-8 py-10"
                                style={{ width: isMobile ? '100%' : '50%', height: isMobile ? '50%' : '100%', background: p.bg }}
                            >
                                <span
                                    className="absolute top-4 left-4 text-white/90 text-xs font-semibold tracking-widest"
                                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                >
                                    {p.label}
                                </span>
                                <h3
                                    className="text-white text-3xl md:text-4xl leading-tight mb-4"
                                    style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", serif' }}
                                >
                                    {p.headline}
                                </h3>
                                <p className="text-white/90 text-sm md:text-base leading-relaxed font-poppins">
                                    {p.body}
                                </p>
                            </div>

                            {/* right half image */}
                            <div
                                className="relative overflow-hidden"
                                style={{ width: isMobile ? '100%' : '50%', height: isMobile ? '50%' : '100%' }}
                            >
                                <img
                                    ref={(el) => {
                                        imgRefs.current[i] = el
                                    }}
                                    src={p.image}
                                    alt={p.label}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default SplitPanelAccordion