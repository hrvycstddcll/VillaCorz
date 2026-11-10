import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let activeLenis: Lenis | null = null

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

const navbarOffset = () => {
    const nav = document.getElementById('primary-nav')
    const height = nav?.getBoundingClientRect().height ?? 0
    return height + 16
}

/**
 * Scroll to a `#section` while keeping it clear of the fixed navbar.
 * Returns false when the target is not mounted yet, so callers can retry.
 */
export const scrollToHash = (hash: string): boolean => {
    if (typeof window === 'undefined') return false

    let id = hash.replace(/^#/, '')
    try {
        id = decodeURIComponent(id)
    } catch {
        // Keep the raw value when it is not valid percent-encoding.
    }
    if (!id) return false

    const element = document.getElementById(id)
    if (!element) return false

    const top = Math.max(
        0,
        element.getBoundingClientRect().top + window.scrollY - navbarOffset(),
    )

    if (activeLenis) {
        activeLenis.scrollTo(top, { duration: 1.1 })
    } else {
        window.scrollTo({
            top,
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
    }

    return true
}

export const scrollToTop = (immediate = true) => {
    if (typeof window === 'undefined') return

    if (activeLenis) {
        activeLenis.scrollTo(0, { immediate })
        return
    }

    window.scrollTo({
        top: 0,
        behavior: immediate || prefersReducedMotion() ? 'auto' : 'smooth',
    })
}

export const initSmoothScroll = () => {
    if (
        typeof window === 'undefined' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
        return () => {}
    }

    const lenis = new Lenis({
        duration: 1.15,
        easing: (t) => {
            const c1 = 0.7
            const c3 = c1 + 1
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
        },
    })

    activeLenis = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    return () => {
        gsap.ticker.remove(raf)
        lenis.destroy()
        if (activeLenis === lenis) activeLenis = null
    }
}
