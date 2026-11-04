import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type HTMLAttributes,
    type ReactNode,
    type RefObject,
} from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AirVent, BadgePercent, ShieldCheck, Users } from 'lucide-react'
import logoUrl from '../../VillaCorz-SVGLogo.svg'
import TopView from '../../matabungkay-top-view-1600.jpg'

gsap.registerPlugin(ScrollTrigger)

const beachPhoto = TopView
const logo =
    'https://res.cloudinary.com/ql4hruc3/image/upload/v1791786033/VillaCorzLogo.png'

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
.vc-tilt-root{perspective:1000px}
.vc-tilt-inner{position:relative;transform-style:preserve-3d;will-change:transform}
.vc-tilt-flipper{position:relative;transform-style:preserve-3d}
.vc-tilt-glare{position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;background:radial-gradient(circle at var(--gx,50%) var(--gy,50%),rgba(255,255,255,0.9) 0%,transparent 55%);mix-blend-mode:soft-light}
.vc-tilt-face{backface-visibility:hidden}
.vc-tilt-back{position:absolute;inset:0;transform:rotateY(180deg);backface-visibility:hidden}
`

const GlareLayer = ({
    glareRef,
}: {
    glareRef: RefObject<HTMLDivElement | null>
}) => <div ref={glareRef} aria-hidden="true" className="vc-tilt-glare" />

type TiltedCardProps = HTMLAttributes<HTMLDivElement> & {
    children: ReactNode
    back?: ReactNode
    tiltClass?: string
    rotationRange?: number
    scaleOnHover?: number
    glareEnable?: boolean
    glareOpacity?: number
    flipOnClick?: boolean
}

const TiltedCard = ({
    children,
    back,
    className = '',
    tiltClass = '',
    rotationRange = 14,
    scaleOnHover = 1.03,
    glareEnable = true,
    glareOpacity = 0.55,
    flipOnClick = false,
    ...rest
}: TiltedCardProps) => {
    const rootRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLDivElement>(null)
    const flipperRef = useRef<HTMLDivElement>(null)
    const glareRef = useRef<HTMLDivElement>(null)
    const flippedRef = useRef(false)

    useLayoutEffect(() => {
        const root = rootRef.current
        const inner = innerRef.current
        if (!root || !inner) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

        const glare = glareRef.current
        const rotX = gsap.quickTo(inner, 'rotationX', {
            duration: 0.35,
            ease: 'power2.out',
        })
        const rotY = gsap.quickTo(inner, 'rotationY', {
            duration: 0.35,
            ease: 'power2.out',
        })
        const scaleTo = gsap.quickTo(inner, 'scale', {
            duration: 0.35,
            ease: 'power2.out',
        })

        let glareXTo: ((value: number) => void) | null = null
        let glareYTo: ((value: number) => void) | null = null
        let glareOpacityTo: ((value: number) => void) | null = null

        if (glare && glareEnable) {
            const proxy = { x: 50, y: 50 }
            glareXTo = gsap.quickTo(proxy, 'x', {
                duration: 0.35,
                ease: 'power2.out',
                onUpdate: () => glare.style.setProperty('--gx', `${proxy.x}%`),
            })
            glareYTo = gsap.quickTo(proxy, 'y', {
                duration: 0.35,
                ease: 'power2.out',
                onUpdate: () => glare.style.setProperty('--gy', `${proxy.y}%`),
            })
            glareOpacityTo = gsap.quickTo(glare, 'opacity', {
                duration: 0.35,
                ease: 'power2.out',
            })
        }

        const onPointerEnter = () => {
            scaleTo(scaleOnHover)
            glareOpacityTo?.(glareOpacity)
        }

        const onPointerMove = (event: PointerEvent) => {
            const rect = root.getBoundingClientRect()
            const px = (event.clientX - rect.left) / rect.width
            const py = (event.clientY - rect.top) / rect.height
            rotY((px - 0.5) * 2 * rotationRange)
            rotX((0.5 - py) * 2 * rotationRange)
            glareXTo?.(px * 100)
            glareYTo?.(py * 100)
        }

        const onPointerLeave = () => {
            scaleTo(1)
            rotX(0)
            rotY(0)
            glareOpacityTo?.(0)
        }

        root.addEventListener('pointerenter', onPointerEnter)
        root.addEventListener('pointermove', onPointerMove)
        root.addEventListener('pointerleave', onPointerLeave)

        return () => {
            root.removeEventListener('pointerenter', onPointerEnter)
            root.removeEventListener('pointermove', onPointerMove)
            root.removeEventListener('pointerleave', onPointerLeave)
        }
    }, [rotationRange, scaleOnHover, glareEnable, glareOpacity])

    const handleFlip = () => {
        if (!flipOnClick || !flipperRef.current) return
        flippedRef.current = !flippedRef.current
        gsap.to(flipperRef.current, {
            rotationY: flippedRef.current ? 180 : 0,
            duration: 0.7,
            ease: 'power3.inOut',
        })
    }

    return (
        <div
            ref={rootRef}
            {...rest}
            className={`vc-tilt-root ${tiltClass} ${className}`}
        >
            <div ref={innerRef} className="vc-tilt-inner">
                <div
                    ref={flipperRef}
                    className="vc-tilt-flipper"
                    onClick={handleFlip}
                    style={flipOnClick ? { cursor: 'pointer' } : undefined}
                >
                    <div className="vc-tilt-face">{children}</div>
                    {back ? (
                        <div className="vc-tilt-back">{back}</div>
                    ) : null}
                </div>
                {glareEnable ? <GlareLayer glareRef={glareRef} /> : null}
            </div>
        </div>
    )
}

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

            <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8 sm:pb-28">
                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
                    <div className="max-w-md">
                        <h3 className="font-instrument text-2xl text-black sm:text-3xl">
                            About Us
                        </h3>

                        <p className="font-poppins mt-4 text-justify text-[0.8rem] leading-relaxed text-gray-600 sm:text-sm">
                            Villa Corz is a private beach house in Lian, Batangas, made for
                            guests who want a simple, comfortable, and well-priced seaside
                            stay. Whether you are planning a family gathering, a barkada
                            reunion, or a team-building retreat, we offer clean, affordable
                            rooms and spacious common areas where everyone can relax. The
                            property provides two ways to stay: book individual rooms for a
                            smaller group, or reserve the whole house for up to 28 guests.
                            Either way, you get a relaxed, secure, and welcoming base by the
                            sea.
                        </p>

                        <div className="mt-8 flex items-center gap-3">
                            <img
                                src={logo}
                                alt=""
                                aria-hidden="true"
                                className="size-10 rounded-full border border-black/10 bg-white object-contain p-0.5"
                            />
                            <div>
                                <p className="font-serif text-sm font-semibold text-black">
                                    Villa Corz
                                </p>
                                <p className="text-[0.7rem] text-gray-500">
                                    Located: Mabuhangray, Lian, Batangas
                                </p>
                            </div>
                        </div>
                    </div>

                    <img
                        data-about-photo
                        src={beachPhoto}
                        alt="Aerial view of the Villa Corz beach house shoreline"
                        decoding="async"
                        className="h-56 w-full rounded-3xl object-cover shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] sm:h-72 lg:h-80"
                    />
                </div>
            </div>

            <div className='relative z-10 flex flex-col'>
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
                >
                    <div className="absolute left-1/2 top-12 h-56 w-[min(85vw,30rem)] -translate-x-1/2 rounded-full bg-[#006dfc]/8 blur-2xl" />
                    <div className="absolute right-8 bottom-4 h-40 w-56 rounded-full bg-[#006dfc]/6 blur-2xl" />
                </div>

                <div className='flex justify-center items-center py-[1.5rem]'>
                    <span className='font-instrument text-2xl text-black sm:text-3xl'>
                        Why Choose Our Villa?
                    </span>
                </div>

                <div
                    data-reason-grid
                    className="mx-auto grid w-full max-w-6xl gap-5 px-5 pb-20 sm:grid-cols-2 sm:gap-6 sm:px-8 lg:grid-cols-4 lg:pb-24"
                >
                    {reasons.map(({ icon: Icon, tilt, title, body }) => (
                        <TiltedCard key={title} data-reason-card tiltClass={tilt}>
                            <div className="h-full rounded-2xl bg-white/55 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-24px_rgba(15,40,80,0.28)] ring-1 ring-white/70 backdrop-blur-xl transition-[background-color,box-shadow] duration-300 hover:bg-white/70 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_28px_56px_-24px_rgba(0,109,252,0.35)]">
                                <div className="flex size-11 items-center justify-center rounded-xl bg-[#006dfc]/10 text-[#006dfc] ring-1 ring-[#006dfc]/15">
                                    <Icon className="size-5" aria-hidden="true" />
                                </div>
                                <h3 className="mt-4 font-serif text-lg font-semibold leading-snug text-balance text-black">
                                    {title}
                                </h3>
                                <p className="mt-2.5 font-poppins text-[0.78rem] leading-relaxed text-gray-600">
                                    {body}
                                </p>
                            </div>
                        </TiltedCard>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default AboutUs
