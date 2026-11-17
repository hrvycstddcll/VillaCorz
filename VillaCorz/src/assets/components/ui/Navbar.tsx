import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import logoSvg from '../../VillaCorz-SVGLogo.svg?raw'
import {
    BarChart3,
    BedDouble,
    CalendarCheck,
    ChevronDown,
    Images,
    Info,
    LayoutDashboard,
    Menu,
    Quote,
    Tags,
    X,
} from 'lucide-react'
import DirectionalButton from './DirectionalButton'
import GooeyNav, { type GooeyNavChild, type GooeyNavItem } from './GooeyNav'
import SettingsNotch from './SettingsNotch'
import { useAuth } from '../../../services/useAuth'
import { scrollToHash, scrollToTop } from '../../../lib/smoothScroll'

const buttonColor = '#3d8bff'

const logoMarkup = logoSvg

const servicesLinks: GooeyNavChild[] = [
    {
        label: 'Browse services',
        href: '/services',
        description: 'Rooms, exclusive stays, and rates',
        icon: <BedDouble className="size-4" aria-hidden="true" />,
    },
]

const myBookingsLink: GooeyNavChild = {
    label: 'My bookings',
    href: '/bookings',
    description: 'Review or cancel a reservation',
    icon: <CalendarCheck className="size-4" aria-hidden="true" />,
}

const exploreLinks: GooeyNavChild[] = [
    {
        label: 'About us',
        href: '/#about',
        description: 'The story behind the beach house',
        icon: <Info className="size-4" aria-hidden="true" />,
    },
    {
        label: 'Gallery',
        href: '/#gallery',
        description: 'A look around the property',
        icon: <Images className="size-4" aria-hidden="true" />,
    },
    {
        label: 'Testimonials',
        href: '/#testimonials',
        description: 'What past guests remember',
        icon: <Quote className="size-4" aria-hidden="true" />,
    },
]

const adminLinks: GooeyNavChild[] = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        description: 'Bookings and revenue at a glance',
        icon: <LayoutDashboard className="size-4" aria-hidden="true" />,
    },
    {
        label: 'Manage offers',
        href: '/manageOffers',
        description: 'Rooms, rates, and availability',
        icon: <Tags className="size-4" aria-hidden="true" />,
    },
    {
        label: 'Reports',
        href: '/reports',
        description: 'Payment and booking history',
        icon: <BarChart3 className="size-4" aria-hidden="true" />,
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

const dropdownCardBaseClassName =
    'group flex h-full items-start gap-3 rounded-xl border p-3.5 transition-[border-color,background-color,box-shadow] duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const dropdownCardIdleClassName =
    'border-black/[0.06] bg-slate-50/80 hover:border-[#006dfc]/25 hover:bg-[#006dfc]/[0.06]'

const dropdownCardActiveClassName =
    'border-[#006dfc]/30 bg-[#006dfc]/10'

const notchBackground: CSSProperties = {
    backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='M 0 0 L 20 0 C 8.954 0 0 8.954 0 20 Z' fill='%23ffffff'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
}

const DROPDOWN_CLOSE_DELAY = 140

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
    const [dropdownState, setDropdownState] = useState<{
        index: number
        locationKey: string
    } | null>(null)
    const [renderedDropdown, setRenderedDropdown] =
        useState<GooeyNavItem | null>(null)
    const toggleRef = useRef<HTMLButtonElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const notchRef = useRef<HTMLDivElement>(null)
    const dropdownTimerRef = useRef<number | null>(null)

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

    const activeIndex = getActiveIndex(
        location.pathname,
        currentHash,
        Boolean(isAdmin),
    )

    const locationKey = `${location.pathname}${location.search}${location.hash}`
    // Route changes invalidate the stored dropdown without an extra effect.
    const dropdownIndex =
        dropdownState && dropdownState.locationKey === locationKey
            ? dropdownState.index
            : null

    const closeMobile = () => {
        setIsOpen(false)
        setMobileGroup(null)
    }

    const toggleGroup = (group: MobileGroup) => {
        setMobileGroup((current) => (current === group ? null : group))
    }

    const openDropdown = (index: number) => {
        if (dropdownTimerRef.current !== null) {
            window.clearTimeout(dropdownTimerRef.current)
            dropdownTimerRef.current = null
        }
        setRenderedDropdown(items[index] ?? null)
        setDropdownState({ index, locationKey })
    }

    const closeDropdown = () => {
        if (dropdownTimerRef.current !== null) {
            window.clearTimeout(dropdownTimerRef.current)
            dropdownTimerRef.current = null
        }
        setDropdownState(null)
    }

    const scheduleDropdownClose = () => {
        if (dropdownTimerRef.current !== null) return
        dropdownTimerRef.current = window.setTimeout(() => {
            dropdownTimerRef.current = null
            setDropdownState(null)
        }, DROPDOWN_CLOSE_DELAY)
    }

    const clearDropdownClose = () => {
        if (dropdownTimerRef.current === null) return
        window.clearTimeout(dropdownTimerRef.current)
        dropdownTimerRef.current = null
    }

    const toggleDropdown = (index: number, nextOpen: boolean) => {
        if (nextOpen) openDropdown(index)
        else closeDropdown()
    }

    const panelDropdown =
        dropdownIndex !== null
            ? (items[dropdownIndex] ?? renderedDropdown)
            : renderedDropdown
    const panelChildren = panelDropdown?.children ?? []
    const panelOpen = dropdownIndex !== null && panelChildren.length > 0
    const panelGridClassName =
        panelChildren.length > 2
            ? 'sm:grid-cols-3'
            : panelChildren.length === 2
              ? 'sm:grid-cols-2'
              : ''

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
        if (!panelOpen) return

        const handlePointerDown = (event: PointerEvent) => {
            if (notchRef.current?.contains(event.target as Node)) return
            setDropdownState(null)
        }

        document.addEventListener('pointerdown', handlePointerDown)
        return () =>
            document.removeEventListener('pointerdown', handlePointerDown)
    }, [panelOpen])

    useEffect(() => {
        return () => {
            if (dropdownTimerRef.current !== null) {
                window.clearTimeout(dropdownTimerRef.current)
            }
        }
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
        closeDropdown()

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

            <div ref={notchRef} className="relative">
                <div
                    className={`transition-[filter] duration-200 motion-reduce:transition-none ${
                        isOpen
                            ? 'drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)]'
                            : 'drop-shadow-[0_5px_15px_rgba(0,0,0,0.38)]'
                    }`}
                >
                    <div
                        onPointerEnter={clearDropdownClose}
                        onPointerLeave={scheduleDropdownClose}
                        onKeyDown={(event) => {
                            if (event.key !== 'Escape' || !panelOpen) return
                            event.stopPropagation()
                            const trigger =
                                dropdownIndex === null
                                    ? null
                                    : notchRef.current?.querySelector<HTMLButtonElement>(
                                          `[data-gooey-index="${dropdownIndex}"] > button`,
                                      )
                            closeDropdown()
                            trigger?.focus()
                        }}
                        onBlur={(event) => {
                            if (!panelOpen) return
                            const next = event.relatedTarget as Node | null
                            if (!next) return
                            if (notchRef.current?.contains(next)) return
                            closeDropdown()
                        }}
                        className={`relative mx-auto w-[70vw] bg-white transition-[border-radius] duration-200 max-lg:w-[calc(100vw-3rem)] motion-reduce:transition-none lg:max-w-[calc(100vw-12rem)] ${
                            isOpen ? 'rounded-b-none' : 'rounded-b-[18px]'
                        }`}
                    >
                        <div className="relative flex items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
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
                                    dropdownOpenIndex={dropdownIndex}
                                    onDropdownHover={openDropdown}
                                    onDropdownLeave={scheduleDropdownClose}
                                    onDropdownToggle={toggleDropdown}
                                    onDropdownDismiss={closeDropdown}
                                    renderPanels={false}
                                    dropdownPanelId="desktop-dropdown"
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

                        <div
                            id="desktop-dropdown"
                            aria-hidden={!panelOpen}
                            inert={!panelOpen}
                            className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                                panelOpen
                                    ? 'pointer-events-auto grid-rows-[1fr] opacity-100'
                                    : 'pointer-events-none grid-rows-[0fr] opacity-0'
                            }`}
                        >
                            <div
                                className="overflow-hidden"
                                onPointerEnter={clearDropdownClose}
                            >
                                <div className="px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
                                    <ul
                                        aria-label={
                                            panelDropdown
                                                ? `${panelDropdown.label} menu`
                                                : undefined
                                        }
                                        className={`grid gap-2.5 ${panelGridClassName}`}
                                    >
                                        {panelChildren.map((child, index) => {
                                            const active = child.href === activeHref

                                            return (
                                                <li
                                                    key={`${child.href}-${index}`}
                                                >
                                                    <Link
                                                        to={child.href}
                                                        aria-current={
                                                            active ? 'page' : undefined
                                                        }
                                                        onClick={closeDropdown}
                                                        className={`${dropdownCardBaseClassName} ${
                                                            active
                                                                ? dropdownCardActiveClassName
                                                                : dropdownCardIdleClassName
                                                        }`}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className="grid size-9 shrink-0 place-items-center rounded-lg border border-black/[0.05] bg-white text-[#006dfc] shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                                                        >
                                                            {child.icon}
                                                        </span>
                                                        <span className="flex min-w-0 flex-col">
                                                            <span className="font-poppins text-[13px] font-semibold leading-5 text-slate-800">
                                                                {child.label}
                                                            </span>
                                                            {child.description && (
                                                                <span className="mt-0.5 text-[11.5px] font-normal leading-4 text-slate-500 text-wrap-pretty">
                                                                    {child.description}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </Link>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {!loading && !user && (
                    <div className="absolute right-0 top-[30px] hidden -translate-y-1/2 items-center lg:flex">
                        <DirectionalButton
                            fillColor="#ffffff"
                            textColor="#006dfc"
                            onClick={() => navigate('/auth?mode=login')}
                            className="bg-[#006dfc] px-5 py-2.5 font-poppins text-[clamp(0.6875rem,0.8vw,0.75rem)] font-semibold tracking-wide text-white"
                        >
                            LOGIN
                        </DirectionalButton>
                    </div>
                )}

                {!loading && user && <SettingsNotch />}

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
