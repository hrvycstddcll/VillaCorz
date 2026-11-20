import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AirVent, BadgePercent, ShieldCheck, Users } from 'lucide-react'
import logoUrl from '../../VillaCorz-SVGLogo.svg'

import CountUp from '../ui/CountUp'
import AccordionGallery from '../ui/AccordionGallery'
import GradientASCII from '../ui/GradientASCII'
import ReflectiveCard from '../ui/ReflectiveCard'

gsap.registerPlugin(ScrollTrigger)

const reasons = [
    {
        icon: BadgePercent,
        tilt: '-rotate-2',
        title: 'Best Direct Rates Guarantee',
        body: 'Our rates are clear and competitive, with a 20% weekday discount from Monday to Thursday. You can plan your stay knowing exactly what to expect.',
    },
    {
        icon: Users,
        tilt: 'rotate-[1.5deg]',
        title: 'Designed for Gatherings',
        body: 'Shared dining and lounge areas provide room for meals, conversation, and celebrations. With exclusive booking, the entire property is yours — perfect for birthdays, reunions, and group events.',
    },
    {
        icon: AirVent,
        tilt: '-rotate-[1.5deg]',
        title: 'Spacious, Air-Conditioned Rooms',
        body: 'Rest in clean, generously sized rooms that stay cool through the afternoon heat — each one ready for restful nights after a full day by the sea.',
    },
    {
        icon: ShieldCheck,
        tilt: 'rotate-2',
        title: 'Safe and Secure',
        body: 'Your comfort and peace of mind come first. Villa Corz offers a secure environment where families and groups can relax with confidence.',
    },
]

const tiltStyles = `
.vc-tilt-root,.vc-tilt-inner,.vc-tilt-flipper,.vc-tilt-face{height:100%}
.vc-tilt-root{perspective:1000px}
.vc-tilt-inner{position:relative;transform-style:preserve-3d;will-change:transform}
.vc-tilt-flipper{position:relative;transform-style:preserve-3d}
.vc-tilt-glare{position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;background:radial-gradient(circle at var(--gx,50%) var(--gy,50%),rgba(255,255,255,0.9) 0%,transparent 55%);mix-blend-mode:soft-light}
.vc-tilt-face{backface-visibility:hidden}
.vc-tilt-back{position:absolute;inset:0;transform:rotateY(180deg);backface-visibility:hidden}
`


const AboutUs = () => {
    const rootRef = useRef<HTMLElement>(null)
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(
        () =>
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )

    useLayoutEffect(() => {
        const section = rootRef.current
        const wm = section?.querySelector<HTMLElement>('[data-about-watermark]')
        let teardown: (() => void) | null = null

        if (wm) {
            wm.style.setProperty('--mx', '0px')
            wm.style.setProperty('--my', '0px')
            wm.style.setProperty('--r', prefersReducedMotion ? '200vw' : '0px')
        }

        const context = gsap.context(() => {
            if (!section || !wm || prefersReducedMotion) return

            gsap.fromTo(
                '[data-about-headline]',
                { clipPath: 'inset(0% 0% 100% 0%)' },
                {
                    clipPath: 'inset(0% 0% 0% 0%)',
                    ease: 'none',
                    scrollTrigger: {
                        trigger: '[data-about-panel]',
                        start: 'top center',
                        end: 'top 10%',
                        scrub: 0.6,
                    },
                },
            )

            gsap.fromTo(
                '[data-about-photo]',
                { clipPath: 'inset(0% 0% 100% 0%)' },
                {
                    clipPath: 'inset(0% 0% 0% 0%)',
                    duration: 1,
                    ease: 'power3.inOut',
                    scrollTrigger: {
                        trigger: '[data-about-photo]',
                        start: 'top 80%',
                        once: true,
                    },
                },
            )

            gsap.fromTo(
                '[data-reason-card]',
                { y: 44, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.7,
                    stagger: 0.1,
                    ease: 'power3.out',
                    clearProps: 'all',
                    scrollTrigger: {
                        trigger: '[data-reason-grid]',
                        start: 'top 85%',
                        once: true,
                    },
                },
            )

            const pos = { x: 0, y: 0, r: 0 }
            const xTo = gsap.quickTo(pos, 'x', {
                duration: 0.15,
                ease: 'power2.out',
                onUpdate: () => wm.style.setProperty('--mx', `${pos.x}px`),
            })
            const yTo = gsap.quickTo(pos, 'y', {
                duration: 0.15,
                ease: 'power2.out',
                onUpdate: () => wm.style.setProperty('--my', `${pos.y}px`),
            })
            const rTo = gsap.quickTo(pos, 'r', {
                duration: 0.3,
                ease: 'power2.out',
                onUpdate: () => wm.style.setProperty('--r', `${pos.r}px`),
            })

            const updatePosition = (clientX: number, clientY: number) => {
                const rect = wm.getBoundingClientRect()
                xTo(clientX - rect.left)
                yTo(clientY - rect.top)
            }

            let pointer: { x: number; y: number } | null = null
            const track = (event: PointerEvent) => {
                pointer = { x: event.clientX, y: event.clientY }
                updatePosition(pointer.x, pointer.y)
            }
            const onPointerEnter = (event: PointerEvent) => {
                track(event)
                rTo(160)
            }

            const onPointerMove = (event: PointerEvent) => track(event)

            const onPointerLeave = () => {
                pointer = null
                rTo(0)
            }
            const onScroll = () => {
                if (pointer) updatePosition(pointer.x, pointer.y)
            }

            section.addEventListener('pointerenter', onPointerEnter)
            section.addEventListener('pointermove', onPointerMove)
            section.addEventListener('pointerleave', onPointerLeave)
            window.addEventListener('scroll', onScroll, { passive: true })

            teardown = () => {
                section.removeEventListener('pointerenter', onPointerEnter)
                section.removeEventListener('pointermove', onPointerMove)
                section.removeEventListener('pointerleave', onPointerLeave)
                window.removeEventListener('scroll', onScroll)
            }
        }, rootRef)

        return () => {
            teardown?.()
            context.revert()
        }
    }, [prefersReducedMotion])

    useEffect(() => {
        const motionPreference = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        )
        const updateMotionPreference = () =>
            setPrefersReducedMotion(motionPreference.matches)

        motionPreference.addEventListener('change', updateMotionPreference)
        return () =>
            motionPreference.removeEventListener('change', updateMotionPreference)
    }, [])

    return (
        <section
            ref={rootRef}
            id="about"
            className="relative scroll-mt-24 bg-white"
        >
            <style>{tiltStyles}</style>
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
            >
                <div
                    data-about-watermark
                    className="relative h-full min-h-svh w-full overflow-hidden opacity-10"
                    style={{
                        maskImage:
                            'radial-gradient(circle var(--r, 0px) at var(--mx, 50%) var(--my, 50%), #000 0%, #000 55%, transparent 100%)',
                        WebkitMaskImage:
                            'radial-gradient(circle var(--r, 0px) at var(--mx, 50%) var(--my, 50%), #000 0%, #000 55%, transparent 100%)',
                        maskRepeat: 'no-repeat',
                        WebkitMaskRepeat: 'no-repeat',
                        willChange: 'mask-image',
                    }}
                >
                    <svg
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full"
                    >
                        <defs>
                            <pattern
                                id="vc-logo-tiles"
                                width="208"
                                height="80"
                                patternUnits="userSpaceOnUse"
                            >
                                <image
                                    href={logoUrl}
                                    x="16"
                                    y="15"
                                    width="176"
                                    height="50"
                                    preserveAspectRatio="xMidYMid meet"
                                />
                            </pattern>
                        </defs>
                        <rect
                            width="100%"
                            height="100%"
                            fill="url(#vc-logo-tiles)"
                        />
                    </svg>
                </div>
            </div>
            <div
                data-about-panel
                className="relative flex min-h-svh w-full items-center overflow-hidden"
            >
                <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-24 sm:px-8">
                    <h2
                        data-about-headline
                        className="font-serif text-[clamp(2.5rem,9vw,8rem)] leading-[0.92] tracking-tight text-black"
                    >
                        <span className="block">Your</span>
                        <span className="block pl-[14%] sm:pl-[20%]">Beach house,</span>
                        <span className="block pl-[4%] font-instrument italic text-[#006dfc] sm:pl-[8%]">
                            wherever the tide
                        </span>
                        <span className="block pl-[16%] sm:pl-[24%]">Takes you home</span>
                    </h2>
                </div>
            </div>

            <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-8 sm:px-8 sm:pb-12">
                <div className="grid items-start gap-10 pt-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
                    <div className="max-w-md pl-[3.8rem] sm:pl-[7.0rem]">
                        <h3 className="font-instrument text-2xl tracking-[-0.05em] text-black sm:text-3xl">
                            About Us
                        </h3>

                        <p className="font-helvetica-world mt-4 text-justify text-[0.8rem] leading-relaxed text-gray-600 sm:text-sm">
                            Welcome to Villa Corz. Here we blend coastal comfort, flexible
                            group stays, and genuine Batangueño warmth to create effortless
                            seaside getaways just two hours from Manila.
                        </p>
                    </div>

                    <div className="mt-10 max-w-md lg:max-w-none">
                        <p className="font-helvetica-world max-w-[calc(100%-4rem)] text-justify text-[0.8rem] leading-relaxed text-gray-600 sm:max-w-[calc(100%-7rem)] sm:text-sm">
                            Located in Lian, Batangas near the iconic shores of Matabungkay
                            and the hidden coves of Ligtasin and Kaynipa our private beach
                            house offers the sweet spot between crowded commercial resorts
                            and cramped rentals. Enjoy clean, air-conditioned rooms, spacious
                            common areas, and golden sunsets in a relaxed setting where time
                            slows down. Whether you are planning an intimate weekend or a
                            full-house celebration, we make booking simple and well-priced.
                            Reserve individual rooms for a smaller barkada, or claim the
                            entire villa exclusively for 30 to 35 guests giving your family,
                            friends, or team a secure, welcoming home by the sea.
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative z-10 w-full">
                <div className="grid w-full grid-cols-1 gap-px border-y border-[#DFD7C8] bg-[#DFD7C8] md:grid-cols-2 lg:grid-cols-4">
                    {[
                        {
                            node: (
                                <>
                                    30–
                                    <CountUp
                                        from={0}
                                        to={35}
                                        trigger="view"
                                        mode="roll"
                                        easing="expo"
                                        duration={1.8}
                                        replayOnHover={true}
                                    />
                                </>
                            ),
                            label: 'MAX GROUP CAPACITY',
                        },
                        {
                            node: (
                                <CountUp
                                    from={0}
                                    to={2}
                                    suffix=" Mins"
                                    trigger="view"
                                    mode="roll"
                                    easing="expo"
                                    duration={1.8}
                                    replayOnHover={true}
                                />
                            ),
                            label: 'WALK TO THE SHORE',
                        },
                        {
                            node: (
                                <CountUp
                                    from={0}
                                    to={2}
                                    suffix=" Hrs"
                                    trigger="view"
                                    mode="roll"
                                    easing="expo"
                                    duration={1.8}
                                    replayOnHover={true}
                                />
                            ),
                            label: 'DRIVE FROM METRO MANILA',
                        },
                        {
                            node: (
                                <CountUp
                                    from={0}
                                    to={100}
                                    suffix="%"
                                    trigger="view"
                                    mode="roll"
                                    easing="expo"
                                    duration={1.8}
                                    replayOnHover={true}
                                />
                            ),
                            label: 'AIR-CONDITIONED ROOMS',
                        },
                    ].map((item, idx) => (
                        <div
                            key={idx}
                            className="flex min-h-[160px] flex-col items-center justify-center bg-white px-4 py-16 text-center"
                        >
                            <span
                                className="font-instrument font-semibold text-black"
                                style={{
                                    fontSize: 'clamp(3.5rem, 5vw, 5rem)',
                                    letterSpacing: '-0.04em',
                                    lineHeight: 1,
                                }}
                            >
                                {item.node}
                            </span>
                            <span
                                className="mt-3 font-poppins text-gray-500"
                                style={{
                                    fontSize: '0.7rem',
                                    letterSpacing: '0.14em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative z-10 w-full bg-white py-32">
                <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-16 px-12 lg:grid-cols-2">
                    <div className="flex flex-col justify-center">
                        <h2 className="font-instrument text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-[-0.04em] text-black">
                            Why{' '}
                            <span className="italic text-[#006dfc]">Choose Us</span>?
                        </h2>
                        <p className="mt-5 max-w-md font-helvetica-world text-sm leading-relaxed text-gray-600 sm:text-base">
                            Step into an exclusive villa designed for effortless gatherings,
                            peaceful group retreats, and unforgettable coastal stays.
                        </p>
                    </div>

                    <div className="flex flex-col gap-6">
                        <ReflectiveCard
                            theme="light"
                            width={320}
                            height={220}
                            radius={16}
                            tint="#ffffff"
                            metalness={0.6}
                            roughness={0.2}
                            intro={false}
                            className="w-full"
                            style={{ width: '100%', '--rc-pad': '0px' }}
                        >
                            <div className="relative z-50 h-full isolation-isolate">
                                <GradientASCII
                                    className="absolute inset-0 z-0 pointer-events-none"
                                    style={{}}
                                    dpr={2}
                                    colors={['#4f8ff7', '#e8f0ff', '#b4d0ff', '#7cb4fb']}
                                    shape="horizon"
                                    characters=" =+xX0S8#@"
                                    cellSize={16}
                                    density={0.8}
                                    lightMode
                                />
                                <div className="relative z-50 flex h-full items-start gap-4 p-4">
                                    <span className="text-4xl font-serif leading-none text-white drop-shadow">
                                        “
                                    </span>
                                    <p className="font-helvetica-world text-sm leading-relaxed text-white drop-shadow sm:text-base">
                                        Shared dining and lounge areas provide room for meals,
                                        conversation, and celebrations. With exclusive booking, the
                                        entire property is yours, which makes it well suited to
                                        birthdays, reunions, and group events.
                                    </p>
                                </div>
                            </div>
                        </ReflectiveCard>

                        <div className="flex flex-wrap gap-4">
                            {reasons.map(({ icon: Icon, title }) => (
                                <div
                                    key={title}
                                    className="group inline-flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-sm transition hover:bg-[#006dfc] hover:shadow-md"
                                >
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#006dfc]/10 text-[#006dfc] transition-colors group-hover:bg-white/20 group-hover:text-white">
                                        <Icon className="size-5" aria-hidden="true" />
                                    </span>
                                    <span className="font-instrument text-base font-medium text-black transition-colors group-hover:text-white">
                                        {title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-10 w-full" style={{ marginBottom: 0, paddingBottom: 0 }}>
                <AccordionGallery
                    height="100vh"
                    gap={0}
                    radius={0}
                    tilt={0}
                    grayscale={false}
                    expandRatio={0.82}
                    trigger="click"
                />
            </div>
        </section>
    )
}

export default AboutUs
