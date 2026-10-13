import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import DirectionalButton from '../ui/DirectionalButton'
import { useAuth } from '../../../services/AuthContext'

const backgroundVideo =
    'https://res.cloudinary.com/ql4hruc3/video/upload/q_auto:good,w_1920,c_limit/v1791730522/home-background.mp4'
const backgroundPoster =
    'https://res.cloudinary.com/ql4hruc3/video/upload/so_0,w_1920,c_limit/v1791730522/home-background.jpg'

const HomePage = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(
        () =>
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
    const rootRef = useRef<HTMLElement>(null)

    useLayoutEffect(() => {
        const context = gsap.context(() => {
            const targets = gsap.utils.toArray<HTMLElement>('[data-hero]')

            if (prefersReducedMotion) {
                gsap.set(targets, { autoAlpha: 1, yPercent: 0 })
                return
            }

            gsap.fromTo(
                targets,
                { autoAlpha: 0, yPercent: 30 },
                {
                    autoAlpha: 1,
                    yPercent: 0,
                    duration: 1,
                    stagger: 0.12,
                    ease: 'power3.out',
                    clearProps: 'all',
                },
            )
        }, rootRef)

        return () => context.revert()
    }, [prefersReducedMotion])

    useEffect(() => {
        // Reduce the motion according to users preference
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
            className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-black pt-16 sm:pt-20"
        >
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${backgroundPoster}")` }}
                aria-hidden="true"
            />
            {!prefersReducedMotion && (
                <video
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    poster={backgroundPoster}
                    aria-hidden="true"
                >
                    <source src={backgroundVideo} type="video/mp4" />
                </video>
            )}

            <div
                className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_35%,transparent,rgba(0,0,0,0.55)_100%)]"
                aria-hidden="true"
            />
            <div
                className="absolute inset-0 bg-[radial-gradient(110%_90%_at_50%_40%,rgba(0,109,252,0.18),transparent_60%)]"
                aria-hidden="true"
            />
            <div
                className="absolute inset-0 bg-linear-to-b from-black/20 via-black/10 to-black/70"
                aria-hidden="true"
            />

            <div className="relative z-10 flex w-full flex-col items-center justify-center gap-8 px-3 py-10 sm:gap-10 sm:px-6 sm:py-12">
                <div className="flex w-full flex-col items-center justify-center">
                    <div
                        className="flex w-full items-center justify-center gap-3 sm:gap-4 mb-8"
                        data-hero
                    >
                        <p className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-white/90 sm:text-sm">
                            {user
                            ? `Welcome, ${user.firstname} ${user.lastname} to`
                            : 'Welcome to'
                            }
                        </p>
                    </div>

                    <h1
                        className="mt-4 w-full max-w-full font-brittany text-center text-[clamp(1.5rem,8vw,5.5rem)] leading-tight text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.45)] sm:mt-6 sm:text-5xl md:text-6xl lg:text-8xl"
                        data-hero
                    >
                        VillaCorz Beach House
                    </h1>

                    <div
                        className="mt-8 flex w-full flex-col items-center justify-center sm:mt-12"
                        data-hero
                    >
                        <p className="text-center font-poppins text-[clamp(1.125rem,4vw,1.875rem)] uppercase leading-snug text-white tracking-[0.15em]">
                            Your Cozy Getaway by the Sea.
                        </p>
                        <p className="mt-3 max-w-[550px] text-center font-poppins text-xs leading-relaxed text-white/85 sm:text-sm">
                            Gather, celebrate, and create unforgettable memories
                            where the tide sets the pace and the shore is always
                            just steps away.
                        </p>
                    </div>
                </div>

                <div
                    className="flex w-full flex-col items-center justify-center gap-3 min-[420px]:flex-row sm:gap-6"
                    data-hero
                >
                    <DirectionalButton
                        fillColor="#006dfc"
                        textColor="#ffffff"
                        className="w-full max-w-xs border-2 border-white bg-transparent px-4 py-3 font-poppins font-bold text-white sm:w-auto sm:px-8 sm:py-4"
                    >
                        EXPLORE
                    </DirectionalButton>

                    <DirectionalButton
                        fillColor="#006dfc"
                        textColor="#ffffff"
                        onClick={() => navigate('/auth?mode=register')}
                        className="w-full max-w-xs border-2 border-white bg-white px-4 py-3 font-poppins font-bold text-[#006dfc] sm:w-auto sm:px-8 sm:py-4"
                    >
                        GET STARTED
                    </DirectionalButton>
                </div>
            </div>
        </section>
    )
}

export default HomePage