import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import logoSvg from '../../../VillaCorz-SVGLogo.svg?raw'
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react'
import DirectionalButton from './DirectionalButton'
import GooeyNav, { type GooeyNavChild, type GooeyNavItem } from '../CssComponents/GooeyNav'
import { useAuth } from '../../../../services/useAuth'
import { scrollToHash, scrollToTop } from '../../../../lib/smoothScroll'

const buttonColor = '#3d8bff'

const logoMarkup = logoSvg

const navArrowIcon = (
    <ArrowUpRight
        className="size-4 text-[#006dfc] transition-[color,transform] duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#003079] motion-reduce:transition-none"
        aria-hidden="true"
    />
)

const servicesLinks: GooeyNavChild[] = [
    {
        label: 'Browse services',
        href: '/services',
        icon: navArrowIcon,
    },
]

const myBookingsLink: GooeyNavChild = {
    label: 'My bookings',
    href: '/bookings',
    icon: navArrowIcon,
}

const exploreLinks: GooeyNavChild[] = [
    {
        label: 'About us',
        href: '/#about',
        icon: navArrowIcon,
    },
    {
        label: 'Gallery',
        href: '/#gallery',
        icon: navArrowIcon,
    },
    {
        label: 'Testimonials',
        href: '/#testimonials',
        icon: navArrowIcon,
    },
]

const adminLinks: GooeyNavChild[] = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: navArrowIcon,
    },
    {
        label: 'Manage offers',
        href: '/manageOffers',
        icon: navArrowIcon,
    },
    {
        label: 'Reports',
        href: '/reports',
        icon: navArrowIcon,
    },
]

const adminItem: GooeyNavItem = {
    label: 'Admin',
    href: '/dashboard',
    align: 'end',
    children: adminLinks,
}

const getActiveIndex = (pathname: string, hash: string, isAdmin: boolean) => {
    if (isAdmin && adminLinks.some((link) => link.href === pathname)) {
        return 4
    }
    if (pathname === '/services' || pathname === '/bookings') return 1
    if (hash === '#about' || hash === '#gallery' || hash === '#testimonials') {
        return 2
    }
    if (hash === '#contact') return 3
    return 0
}

const gooeyListClassName = 'hidden items-center gap-1 lg:flex xl:gap-2'

const gooeyLinkClassName =
    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-poppins text-[clamp(0.6875rem,0.85vw,0.875rem)] uppercase tracking-[clamp(0.06em,0.14vw,0.2em)] text-gray-600 transition-colors hover:text-black focus-visible:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006dfc]/60 focus-visible:ring-offset-2 xl:px-3'

const mobileItemClassName =
    'block w-full rounded-xl px-4 py-3.5 text-left text-[clamp(0.875rem,2.4vw,1rem)] font-medium uppercase tracking-[clamp(0.08em,0.3vw,0.2em)] text-gray-600 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8bff]/60 focus-visible:ring-inset'

const mobileSubItemClassName =
    'block w-full rounded-lg px-4 py-2.5 text-left text-[clamp(0.8125rem,2.1vw,0.9375rem)] font-medium tracking-wide text-gray-600 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3d8bff]/60'

const mobileSubItemActiveClassName =
    'bg-[#006dfc]/10 font-semibold text-[#003079]'

const notchBackground: CSSProperties = {
    backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='M 0 0 L 20 0 C 8.954 0 0 8.954 0 20 Z' fill='%23ffffff'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
}

type MobileGroup = 'services' | 'explore' | 'admin'

type MobileDisclosureProps = {
    id: string
    label: string
    open: boolean
    onToggle: () => void
    children: ReactNode
}

const MobileDisclosure = ({
    id,
    label,
    open,
    onToggle,
    children,
}: MobileDisclosureProps) => (
    <li>
        <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={onToggle}
            className={`${mobileItemClassName} flex items-center justify-between`}
        >
            {label}
            <ChevronDown
                className={`size-5 transition-transform duration-200 motion-reduce:transition-none ${
                    open ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
            />
        </button>

        <div
            id={id}
            inert={!open}
            aria-hidden={!open}
            className={`overflow-hidden transition-[max-height,opacity] duration-200 motion-reduce:transition-none ${
                open ? 'max-h-[30rem] opacity-100' : 'max-h-0 opacity-0'
            }`}
        >
            <ul className="ml-4 flex flex-col gap-1 border-l border-black/10 pb-1 pl-3 pt-1">
                {children}
            </ul>
        </div>
    </li>
)

const Navbar = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, loading } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [mobileGroup, setMobileGroup] = useState<MobileGroup | null>(null)
    const [fullMenuOpen, setFullMenuOpen] = useState(false)
    const toggleRef = useRef<HTMLButtonElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const desktopMenuRef = useRef<HTMLDivElement>(null)
    const menuCloseTimerRef = useRef<number | null>(null)

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

    const serviceChildren = useMemo(
        () => (user ? [...servicesLinks, myBookingsLink] : servicesLinks),
        [user],
    )

    const siteItems = useMemo<GooeyNavItem[]>(
        () => [
            { label: 'Home', href: '/#home' },
            {
                label: 'Services',
                href: '/services',
                children: serviceChildren,
            },
            { label: 'Explore', href: '/#about', children: exploreLinks },
            { label: 'Contact', href: '/#contact' },
        ],
        [serviceChildren],
    )

    const items = useMemo(
        () => (isAdmin ? [...siteItems, adminItem] : siteItems),
        [isAdmin, siteItems],
    )

    const menuGroups = useMemo(
        () =>
            items
                .filter(
                    (item): item is GooeyNavItem & { children: NonNullable<GooeyNavItem['children']> } =>
                        Boolean(item.children?.length),
                )
                .map((item) => ({ label: item.label, links: item.children })),
        [items],
    )

    const menuGridClassName =
        menuGroups.length > 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'

    const activeIndex = getActiveIndex(
        location.pathname,
        currentHash,
        Boolean(isAdmin),
    )

    const closeMobile = () => {
        setIsOpen(false)
        setMobileGroup(null)
    }

    const toggleGroup = (group: MobileGroup) => {
        setMobileGroup((current) => (current === group ? null : group))
    }

    const clearMenuClose = () => {
        if (menuCloseTimerRef.current === null) return
        window.clearTimeout(menuCloseTimerRef.current)
        menuCloseTimerRef.current = null
    }

    const openMenu = () => {
        clearMenuClose()
        setFullMenuOpen(true)
    }

    const scheduleMenuClose = () => {
        clearMenuClose()
        menuCloseTimerRef.current = window.setTimeout(() => {
            menuCloseTimerRef.current = null
            setFullMenuOpen(false)
        }, 160)
    }

    useEffect(() => {
        return () => {
            if (menuCloseTimerRef.current !== null) {
                window.clearTimeout(menuCloseTimerRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (!fullMenuOpen) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setFullMenuOpen(false)
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (desktopMenuRef.current?.contains(event.target as Node)) return
            setFullMenuOpen(false)
        }

        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('pointerdown', handlePointerDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('pointerdown', handlePointerDown)
        }
    }, [fullMenuOpen])

    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 1024px)')
        const handleChange = (event: MediaQueryListEvent) => {
            if (event.matches) {
                setIsOpen(false)
                setMobileGroup(null)
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
                setMobileGroup(null)
                toggleRef.current?.focus()
            }
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node
            if (panelRef.current?.contains(target)) return
            if (toggleRef.current?.contains(target)) return
            setIsOpen(false)
            setMobileGroup(null)
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

    /**
     * In-app navigation keeps the navbar mounted, so the gooey pill can finish
     * its animation and the auth state never resets between routes.
     */
    const goTo = (href: string) => {
        closeMobile()
        setFullMenuOpen(false)

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

    const mobileChildLinkClass = (href: string) =>
        `${mobileSubItemClassName} ${
            href === activeHref ? mobileSubItemActiveClassName : ''
        }`

    const desktopAction = loading
        ? null
        : user
          ? {
                label: 'SETTINGS',
                onClick: () => {
                    setFullMenuOpen(false)
                    navigate('/settings')
                },
            }
          : {
                label: 'LOGIN',
                onClick: () => {
                    setFullMenuOpen(false)
                    navigate('/auth?mode=login')
                },
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
                        ref={desktopMenuRef}
                        onPointerLeave={scheduleMenuClose}
                        className="relative mx-auto w-[70vw] max-lg:w-[calc(100vw-3rem)] lg:max-w-[calc(100vw-12rem)]"
                    >
                        <div
                            className={`relative flex items-center justify-between gap-4 bg-white px-4 py-2.5 transition-[border-radius] duration-200 sm:px-6 motion-reduce:transition-none ${
                                isOpen ? 'rounded-b-none' : 'rounded-b-[18px]'
                            }`}
                        >
                            <Link
                                to="/#home"
                                onClick={() => {
                                    closeMobile()
                                    setFullMenuOpen(false)
                                    if (
                                        location.pathname === '/' &&
                                        location.hash === '#home'
                                    ) {
                                        scrollToTop()
                                    }
                                }}
                                className="flex h-6 w-auto shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8bff]/60 focus-visible:ring-offset-2 sm:h-7 lg:h-8 [&>svg]:h-full [&>svg]:w-auto"
                                aria-label="VillaCorz Beach House"
                                dangerouslySetInnerHTML={{ __html: logoMarkup }}
                            />

                            <div
                                className="absolute left-1/2 hidden -translate-x-1/2 lg:block"
                                onPointerEnter={openMenu}
                                onFocus={openMenu}
                            >
                                <GooeyNav
                                    key={isAdmin ? 'admin-nav' : 'guest-nav'}
                                    items={items}
                                    activeIndex={activeIndex}
                                    activeHref={activeHref}
                                    onNavigate={goTo}
                                    color="#006dfc"
                                    hoverColor="rgba(0, 109, 252, 0.14)"
                                    listClassName={gooeyListClassName}
                                    linkClassName={gooeyLinkClassName}
                                    renderPanels={false}
                                    dropdownOpenIndex={null}
                                    dropdownPanelId="desktop-menu"
                                />
                            </div>

                            {desktopAction && (
                                <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 lg:block">
                                    <DirectionalButton
                                        fillColor="#ffffff"
                                        textColor="#006dfc"
                                        onClick={desktopAction.onClick}
                                        className="bg-[#006dfc] px-4 py-2 font-poppins text-[clamp(0.625rem,0.75vw,0.75rem)] font-semibold tracking-wide text-white"
                                    >
                                        {desktopAction.label}
                                    </DirectionalButton>
                                </div>
                            )}

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
                                        setFullMenuOpen(false)
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

                        <div
                            id="desktop-menu"
                            inert={!fullMenuOpen}
                            aria-hidden={!fullMenuOpen}
                            onPointerEnter={clearMenuClose}
                            className={`mx-1 mt-1 grid rounded-[18px] bg-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none ${
                                fullMenuOpen
                                    ? 'pointer-events-auto grid-rows-[1fr] opacity-100'
                                    : 'pointer-events-none grid-rows-[0fr] opacity-0'
                            }`}
                        >
                            <div className="overflow-hidden rounded-[18px]">
                                <div className="px-6 pb-5 pt-4 sm:px-8">
                                    <div
                                        className={`grid gap-x-8 gap-y-5 sm:grid-cols-2 ${menuGridClassName}`}
                                    >
                                        {menuGroups.map((group) => (
                                            <div key={group.label}>
                                                <p className="mb-2 font-poppins text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                    {group.label}
                                                </p>
                                                <ul className="flex flex-col gap-0.5">
                                                    {group.links.map((link) => (
                                                        <li key={link.href}>
                                                            <Link
                                                                to={link.href}
                                                                onClick={(
                                                                    event,
                                                                ) => {
                                                                    event.preventDefault()
                                                                    goTo(
                                                                        link.href,
                                                                    )
                                                                }}
                                                                className={`group flex items-center gap-2.5 rounded-md py-1.5 font-poppins text-[13px] font-semibold text-slate-700 transition-colors hover:bg-transparent hover:text-[#003079] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] ${
                                                                    link.href ===
                                                                    activeHref
                                                                        ? 'text-[#003079]'
                                                                        : ''
                                                                }`}
                                                            >
                                                                {link.icon}
                                                                <span>
                                                                    {link.label}
                                                                </span>
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

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

                            <MobileDisclosure
                                id="mobile-services-menu"
                                label="Services"
                                open={mobileGroup === 'services'}
                                onToggle={() => toggleGroup('services')}
                            >
                                {serviceChildren.map((link) => (
                                    <li key={link.href}>
                                        <Link
                                            to={link.href}
                                            onClick={closeMobile}
                                            aria-current={
                                                link.href === activeHref
                                                    ? 'page'
                                                    : undefined
                                            }
                                            className={mobileChildLinkClass(
                                                link.href,
                                            )}
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </MobileDisclosure>

                            <MobileDisclosure
                                id="mobile-explore-menu"
                                label="Explore"
                                open={mobileGroup === 'explore'}
                                onToggle={() => toggleGroup('explore')}
                            >
                                {exploreLinks.map((link) => (
                                    <li key={link.href}>
                                        <Link
                                            to={link.href}
                                            onClick={closeMobile}
                                            aria-current={
                                                link.href === activeHref
                                                    ? 'page'
                                                    : undefined
                                            }
                                            className={mobileChildLinkClass(
                                                link.href,
                                            )}
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </MobileDisclosure>

                            <li>
                                <Link
                                    to="/#contact"
                                    onClick={closeMobile}
                                    aria-current={
                                        activeHref === '/#contact'
                                            ? 'page'
                                            : undefined
                                    }
                                    className={`${mobileItemClassName} ${
                                        activeHref === '/#contact'
                                            ? mobileSubItemActiveClassName
                                            : ''
                                    }`}
                                >
                                    Contact
                                </Link>
                            </li>
                        </ul>

                        {isAdmin && (
                            <div className="mt-1 border-t border-black/10 pt-2">
                                <ul>
                                    <MobileDisclosure
                                        id="mobile-admin-menu"
                                        label="Admin"
                                        open={mobileGroup === 'admin'}
                                        onToggle={() => toggleGroup('admin')}
                                    >
                                        {adminLinks.map((link) => (
                                            <li key={link.href}>
                                                <NavLink
                                                    to={link.href}
                                                    onClick={closeMobile}
                                                    className={({ isActive }) =>
                                                        `${mobileSubItemClassName} ${
                                                            isActive
                                                                ? mobileSubItemActiveClassName
                                                                : ''
                                                        }`
                                                    }
                                                >
                                                    {link.label}
                                                </NavLink>
                                            </li>
                                        ))}
                                    </MobileDisclosure>
                                </ul>
                            </div>
                        )}

                        {user && (
                            <div className="mt-1 border-t border-black/10 pt-2">
                                <ul>
                                    <li>
                                        <Link
                                            to="/settings"
                                            onClick={closeMobile}
                                            aria-current={
                                                location.pathname === '/settings'
                                                    ? 'page'
                                                    : undefined
                                            }
                                            className={`${mobileItemClassName} ${
                                                location.pathname === '/settings'
                                                    ? mobileSubItemActiveClassName
                                                    : ''
                                            }`}
                                        >
                                            Settings
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        )}

                        <div className="px-1 pb-1 pt-2">
                            {!loading && !user && (
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
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
