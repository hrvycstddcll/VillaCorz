import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
} from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import logoSvg from '../../VillaCorz-SVGLogo.svg?raw'
import { ChevronDown, Menu, X } from 'lucide-react'
import DirectionalButton from './DirectionalButton'
import GooeyNav, { type GooeyNavItem } from './GooeyNav'
import { useAuth } from '../../../services/useAuth'
import LogoutModal from './LogoutModal'
import { scrollToHash, scrollToTop } from '../../../lib/smoothScroll'

const buttonColor = '#3d8bff'

const logoMarkup = logoSvg

const exploreLinks = [
    { label: 'About Us', href: '/#about' },
    { label: 'Gallery', href: '/#gallery' },
    { label: 'Testimonials', href: '/#testimonials' },
]

const adminLinks = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Manage Offers', to: '/manageOffers' },
    { label: 'Reports', to: '/reports' },
]

const adminItem: GooeyNavItem = {
    label: 'Admin',
    href: '/dashboard',
    align: 'end',
    children: adminLinks.map(({ label, to }) => ({ label, href: to })),
}

const EXPLORE_INDEX = 2
const CONTACT_INDEX = 3

const getActiveIndex = (pathname: string, hash: string, isAdmin: boolean) => {
    if (isAdmin && adminLinks.some((link) => link.to === pathname)) {
        return 4
    }
    if (pathname === '/services') return 1
    if (hash === '#about' || hash === '#gallery' || hash === '#testimonials') {
        return EXPLORE_INDEX
    }
    if (hash === '#contact') return CONTACT_INDEX
    return 0
}

const gooeyListClassName = 'hidden items-center gap-1 lg:flex xl:gap-2'

const gooeyLinkClassName =
    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-poppins text-[clamp(0.6875rem,0.85vw,0.875rem)] uppercase tracking-[clamp(0.06em,0.14vw,0.2em)] text-gray-600 transition-colors hover:text-black focus-visible:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006dfc]/60 focus-visible:ring-offset-2 xl:px-3'

const mobileItemClassName =
    'block w-full rounded-xl px-4 py-3.5 text-left text-[clamp(0.875rem,2.4vw,1rem)] font-medium uppercase tracking-[clamp(0.08em,0.3vw,0.2em)] text-gray-600 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8bff]/60 focus-visible:ring-inset'

const mobileSubItemClassName =
    'block rounded-lg px-4 py-2.5 text-[clamp(0.8125rem,2.1vw,0.9375rem)] font-medium tracking-wide text-gray-600 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3d8bff]/60'

const mobileSubItemActiveClassName =
    'bg-[#006dfc]/10 font-semibold text-[#003079]'

const notchBackground: CSSProperties = {
    backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='M 0 0 L 20 0 C 8.954 0 0 8.954 0 20 Z' fill='%23ffffff'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
}

const Navbar = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, loading, logout } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [exploreOpen, setExploreOpen] = useState(false)
    const [adminGroupOpen, setAdminGroupOpen] = useState(false)
    const [showLogoutModal, setShowLogoutModal] = useState(false)
    const toggleRef = useRef<HTMLButtonElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)

    const isAdmin = user?.role === 'admin'

    const [internalSection, setInternalSection] = useState<string | null>(
        null,
    )

    useEffect(() => {
        if (location.pathname !== '/') return

        const sectionIds = ['home', 'about', 'contact']
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter(
                    (entry) => entry.isIntersecting,
                )
                if (visible.length === 0) return
                const topmost = visible.sort(
                    (a, b) =>
                        a.boundingClientRect.top -
                        b.boundingClientRect.top,
                )[0]
                setInternalSection(`#${topmost.target.id}`)
            },
            { rootMargin: '-35% 0px -55% 0px', threshold: 0 },
        )

        sectionIds.forEach((id) => {
            const element = document.getElementById(id)
            if (element) observer.observe(element)
        })

        return () => observer.disconnect()
    }, [location.pathname])

    const activeSection =
        location.pathname === '/'
            ? internalSection ?? location.hash ?? '#home'
            : location.hash

    const currentHash = activeSection

    const activeHref = `${location.pathname}${currentHash}`

    const exploreTriggerLabel =
        exploreLinks.find((link) => link.href === activeHref)?.label ??
        'Explore'

    const siteItems = useMemo(
        () => [
            { label: 'Home', href: '/#home' },
            { label: 'Services', href: '/services' },
            {
                label: exploreTriggerLabel,
                href: '/#about',
                children: exploreLinks,
            },
            { label: 'Contact', href: '/#contact' },
        ],
        [exploreTriggerLabel],
    )

    const items = useMemo(
        () => (isAdmin ? [...siteItems, adminItem] : siteItems),
        [isAdmin, siteItems],
    )

    const activeIndex = getActiveIndex(
        location.pathname,
        currentHash,
        Boolean(isAdmin),
    )

    const closeMobile = () => {
        setIsOpen(false)
        setExploreOpen(false)
        setAdminGroupOpen(false)
    }

    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 1024px)')
        const handleChange = (event: MediaQueryListEvent) => {
            if (event.matches) {
                setIsOpen(false)
                setExploreOpen(false)
                setAdminGroupOpen(false)
            }
        }

        desktop.addEventListener('change', handleChange)
        return () => desktop.removeEventListener('change', handleChange)
    }, [])

    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false)
                setExploreOpen(false)
                setAdminGroupOpen(false)
                toggleRef.current?.focus()
            }
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node
            if (panelRef.current?.contains(target)) return
            if (toggleRef.current?.contains(target)) return
            setIsOpen(false)
            setExploreOpen(false)
            setAdminGroupOpen(false)
        }

        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('pointerdown', handlePointerDown)
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('pointerdown', handlePointerDown)
            document.body.style.overflow = previousOverflow
        }
    }, [isOpen])

    const handleLogout = async () => {
        try {
            await logout()
            setShowLogoutModal(false)
            closeMobile()
            navigate('/')
        } catch {
            alert('Unable to log out. Please try again.')
        }
    }

    const requestLogout = () => {
        closeMobile()
        setShowLogoutModal(true)
    }

    /**
     * In-app navigation keeps the navbar mounted, so the gooey pill can finish
     * its animation and the auth state never resets between routes.
     */
    const goTo = (href: string) => {
        closeMobile()

        const hashIndex = href.indexOf('#')
        const path = hashIndex === -1 ? href : href.slice(0, hashIndex) || '/'
        const hash = hashIndex === -1 ? '' : href.slice(hashIndex)

        if (location.pathname === path && location.hash === hash) {
            if (hash) scrollToHash(hash)
            else scrollToTop()
            return
        }

        navigate(href)
    }

    return (
        <nav
            id="primary-nav"
            aria-label="Primary"
            className="fixed inset-x-0 top-0 z-50 w-full px-6"
        >
            <div
                aria-hidden="true"
                onClick={closeMobile}
                className={`fixed inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none lg:hidden ${
                    isOpen
                        ? 'pointer-events-auto opacity-100'
                        : 'pointer-events-none opacity-0'
                }`}
            />

            <div className="relative">
                <div
                    className={`transition-[filter] duration-200 motion-reduce:transition-none ${
                        isOpen
                            ? 'drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)]'
                            : 'drop-shadow-[0_5px_15px_rgba(0,0,0,0.38)]'
                    }`}
                >
                    <div
                        className={`relative mx-auto flex w-[70vw] max-lg:w-[calc(100vw-3rem)] items-center justify-between gap-4 bg-white px-4 py-2.5 transition-[border-radius] duration-200 sm:px-6 lg:max-w-[calc(100vw-12rem)] ${
                            isOpen ? 'rounded-b-none' : 'rounded-b-[18px]'
                        }`}
                    >
                    <Link
                        to="/#home"
                        onClick={() => {
                            closeMobile()
                            if (
                                location.pathname === '/' &&
                                location.hash === '#home'
                            ) {
                                scrollToTop()
                            }
                        }}
                        className="flex h-8 w-auto shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8bff]/60 focus-visible:ring-offset-2 sm:h-9 lg:h-10 [&>svg]:h-full [&>svg]:w-auto"
                        aria-label="VillaCorz Beach House"
                        dangerouslySetInnerHTML={{ __html: logoMarkup }}
                    />

                    <div className="flex items-center gap-6">
                        <GooeyNav
                            key={isAdmin ? 'admin-nav' : 'guest-nav'}
                            items={items}
                            activeIndex={activeIndex}
                            activeHref={activeHref}
                            onNavigate={goTo}
                            color="#006dfc"
                            hoverColor="rgba(0, 109, 252, 0.14)"
                            className="hidden lg:block"
                            listClassName={gooeyListClassName}
                            linkClassName={gooeyLinkClassName}
                        />

                        <button
                            ref={toggleRef}
                            type="button"
                            aria-label={isOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={isOpen}
                            aria-controls="primary-navigation"
                            onClick={() => {
                                if (isOpen) {
                                    closeMobile()
                                } else {
                                    setIsOpen(true)
                                }
                            }}
                            className="inline-flex h-11 w-11 -mr-1.5 items-center justify-center rounded-xl border border-black/10 bg-black/[0.02] text-black transition hover:bg-black/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8bff]/60 focus-visible:ring-offset-2 lg:hidden"
                        >
                            {isOpen ? (
                                <X className="h-6 w-6" aria-hidden="true" />
                            ) : (
                                <Menu className="h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>

                    <span
                        aria-hidden="true"
                        style={notchBackground}
                        className="pointer-events-none absolute -right-5 top-0 h-5 w-5"
                    />
                    <span
                        aria-hidden="true"
                        style={notchBackground}
                        className="pointer-events-none absolute -left-5 top-0 h-5 w-5 rotate-90"
                    />
                    </div>
                </div>

                {!loading &&
                    (user ? (
                        <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 items-center gap-2 lg:flex">
                            <DirectionalButton
                                fillColor="#ffffff"
                                textColor="#006dfc"
                                onClick={requestLogout}
                                className="bg-[#006dfc] px-5 py-2.5 font-poppins text-[clamp(0.6875rem,0.8vw,0.75rem)] font-semibold tracking-wide text-white"
                            >
                                LOGOUT
                            </DirectionalButton>
                        </div>
                    ) : (
                        <DirectionalButton
                            fillColor="#ffffff"
                            textColor="#006dfc"
                            onClick={() => navigate('/auth?mode=login')}
                            className="absolute right-0 top-1/2 hidden -translate-y-1/2 bg-[#006dfc] px-5 py-2.5 font-poppins text-[clamp(0.6875rem,0.8vw,0.75rem)] font-semibold tracking-wide text-white lg:inline-flex"
                        >
                            LOGIN
                        </DirectionalButton>
                    ))}

                <div
                    ref={panelRef}
                    id="primary-navigation"
                    inert={!isOpen}
                    aria-hidden={!isOpen}
                    className={`absolute inset-x-0 top-full origin-top overflow-hidden rounded-b-[18px] bg-white shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)] transition duration-200 ease-out motion-reduce:transition-none lg:hidden ${
                        isOpen
                            ? 'pointer-events-auto translate-y-0 opacity-100'
                            : 'pointer-events-none -translate-y-2 opacity-0'
                    }`}
                >
                    <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain p-2">
                        <ul className="flex flex-col gap-1">
                            <li>
                                <Link
                                    to="/#home"
                                    onClick={closeMobile}
                                    className={mobileItemClassName}
                                >
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/services"
                                    onClick={closeMobile}
                                    className={mobileItemClassName}
                                >
                                    Services
                                </Link>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    aria-expanded={exploreOpen}
                                    aria-controls="mobile-explore-menu"
                                    onClick={() =>
                                        setExploreOpen((open) => !open)
                                    }
                                    className={`${mobileItemClassName} flex items-center justify-between`}
                                >
                                    {exploreTriggerLabel}
                                    <ChevronDown
                                        className={`size-5 transition-transform duration-200 motion-reduce:transition-none ${
                                            exploreOpen ? 'rotate-180' : ''
                                        }`}
                                        aria-hidden="true"
                                    />
                                </button>

                                <div
                                    id="mobile-explore-menu"
                                    inert={!exploreOpen}
                                    aria-hidden={!exploreOpen}
                                    className={`overflow-hidden transition-[max-height,opacity] duration-200 motion-reduce:transition-none ${
                                        exploreOpen
                                            ? 'max-h-96 opacity-100'
                                            : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    <ul className="ml-4 flex flex-col gap-1 border-l border-black/10 pb-1 pl-3 pt-1">
                                        {exploreLinks.map((link) => {
                                            const isCurrent =
                                                link.href === activeHref
                                            return (
                                                <li key={link.href}>
                                                    <Link
                                                        to={link.href}
                                                        onClick={closeMobile}
                                                        aria-current={
                                                            isCurrent
                                                                ? 'page'
                                                                : undefined
                                                        }
                                                        className={`${mobileSubItemClassName} ${
                                                            isCurrent
                                                                ? mobileSubItemActiveClassName
                                                                : ''
                                                        }`}
                                                    >
                                                        {link.label}
                                                    </Link>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            </li>
                            <li>
                                <Link
                                    to="/#contact"
                                    onClick={closeMobile}
                                    className={mobileItemClassName}
                                >
                                    Contact
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to={
                                        user
                                            ? '/account/settings'
                                            : '/auth?mode=login'
                                    }
                                    onClick={closeMobile}
                                    aria-current={
                                        location.pathname === '/account/settings'
                                            ? 'page'
                                            : undefined
                                    }
                                    className={`${mobileItemClassName} ${
                                        location.pathname === '/account/settings'
                                            ? mobileSubItemActiveClassName
                                            : ''
                                    }`}
                                >
                                    Settings
                                </Link>
                            </li>
                        </ul>

                        {isAdmin && (
                            <div className="mt-1 border-t border-black/10 pt-2">
                                <button
                                    type="button"
                                    aria-expanded={adminGroupOpen}
                                    aria-controls="mobile-admin-menu"
                                    onClick={() =>
                                        setAdminGroupOpen((open) => !open)
                                    }
                                    className={`${mobileItemClassName} flex items-center justify-between`}
                                >
                                    Admin
                                    <ChevronDown
                                        className={`size-5 transition-transform duration-200 motion-reduce:transition-none ${
                                            adminGroupOpen ? 'rotate-180' : ''
                                        }`}
                                        aria-hidden="true"
                                    />
                                </button>

                                <div
                                    id="mobile-admin-menu"
                                    inert={!adminGroupOpen}
                                    aria-hidden={!adminGroupOpen}
                                    className={`overflow-hidden transition-[max-height,opacity] duration-200 motion-reduce:transition-none ${
                                        adminGroupOpen
                                            ? 'max-h-96 opacity-100'
                                            : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    <ul className="ml-4 flex flex-col gap-1 border-l border-black/10 pb-1 pl-3 pt-1">
                                        {adminLinks.map(({ label, to }) => (
                                            <li key={to}>
                                                <NavLink
                                                    to={to}
                                                    onClick={closeMobile}
                                                    className={({ isActive }) =>
                                                        `${mobileSubItemClassName} ${
                                                            isActive
                                                                ? mobileSubItemActiveClassName
                                                                : ''
                                                        }`
                                                    }
                                                >
                                                    {label}
                                                </NavLink>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div className="px-1 pb-1 pt-2">
                            {!loading &&
                                (user ? (
                                    <DirectionalButton
                                        type="button"
                                        fillColor={buttonColor}
                                        style={{ backgroundColor: buttonColor }}
                                        onClick={requestLogout}
                                        className="w-full px-5 py-3.5 text-[clamp(0.875rem,2.4vw,1rem)] font-semibold tracking-wide text-white transition hover:brightness-110"
                                    >
                                        LOGOUT
                                    </DirectionalButton>
                                ) : (
                                    <DirectionalButton
                                        type="button"
                                        fillColor={buttonColor}
                                        style={{ backgroundColor: buttonColor }}
                                        onClick={() => {
                                            closeMobile()
                                            navigate('/auth?mode=login')
                                        }}
                                        className="w-full px-5 py-3.5 text-[clamp(0.875rem,2.4vw,1rem)] font-semibold tracking-wide text-white transition hover:brightness-110"
                                    >
                                        LOGIN
                                    </DirectionalButton>
                                ))}
                        </div>
                    </div>
                </div>
            </div>
            {showLogoutModal && user && (
                <LogoutModal
                    onCancel={() => setShowLogoutModal(false)}
                    onConfirm={handleLogout}
                />
            )}
        </nav>
    )
}

export default Navbar
