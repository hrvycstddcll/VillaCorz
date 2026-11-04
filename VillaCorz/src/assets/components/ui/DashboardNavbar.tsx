
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import logoUrl from '../../VillaCorz-SVGLogo.svg'

const navigationItems = ['Analytics', 'Manage Offers', 'Reports']

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const DashboardNavbar = () => {
    const [menuOpen, setMenuOpen] = useState(false)
    const headerRef = useRef<HTMLElement>(null)
    const spacerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const desktopQuery = window.matchMedia('(min-width: 768px)')

        const closeMenu = () => {
            if (desktopQuery.matches) {
                setMenuOpen(false)
            }
        }

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuOpen(false)
            }
        }

        desktopQuery.addEventListener('change', closeMenu)
        window.addEventListener('keydown', closeOnEscape)

        return () => {
            desktopQuery.removeEventListener('change', closeMenu)
            window.removeEventListener('keydown', closeOnEscape)
        }
    }, [])

    useLayoutEffect(() => {
        const header = headerRef.current
        const spacer = spacerRef.current

        if (!header || !spacer) return

        const syncHeight = () => {
            spacer.style.height = `${header.getBoundingClientRect().height}px`
        }

        syncHeight()

        const observer = new ResizeObserver(syncHeight)
        observer.observe(header)

        return () => observer.disconnect()
    }, [])

    return (
        <>
            <header
                ref={headerRef}
                className="fixed inset-x-0 top-0 z-30 border-b border-slate-200 bg-white shadow-sm"
            >
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6 md:flex-nowrap lg:px-8">

                    {/* Logo */}
                    <Link to="/" className="shrink-0 rounded-md">
                        <img
                            src={logoUrl}
                            alt="VillaCorz home"
                            className="h-auto w-28"
                        />
                    </Link>

                    {/* Mobile menu toggle */}
                    <button
                        type="button"
                        aria-label={
                            menuOpen
                                ? 'Close dashboard menu'
                                : 'Open dashboard menu'
                        }
                        aria-expanded={menuOpen}
                        aria-controls="dashboard-navigation"
                        onClick={() => setMenuOpen((open) => !open)}
                        className={`ml-auto inline-grid size-9 place-items-center rounded-lg text-slate-600 transition hover:bg-[#006dfc]/10 hover:text-[#006dfc] md:hidden ${focusRing}`}
                    >
                        {menuOpen ? (
                            <X className="size-5" aria-hidden="true" />
                        ) : (
                            <Menu className="size-5" aria-hidden="true" />
                        )}
                    </button>

                    {/* Navigation */}
                    <nav
                        id="dashboard-navigation"
                        aria-label="Dashboard sections"
                        className={`${
                            menuOpen ? 'flex' : 'hidden'
                        } order-3 w-full flex-col border-t border-slate-100 pt-3 md:order-none md:flex md:min-w-0 md:flex-1 md:flex-row md:items-center md:justify-center md:border-0 md:pt-0`}
                    >
                        {/* Dashboard navigation links */}
                        <ul className="flex w-full flex-col items-stretch gap-1 md:w-auto md:flex-row md:items-center md:justify-center">
                            {navigationItems.map((label, index) => {
                                const active = index === 0

                                return (
                                    <li key={label}>
                                        <button
                                            type="button"
                                            disabled={!active}
                                            aria-current={
                                                active ? 'page' : undefined
                                            }
                                            title={
                                                active
                                                    ? undefined
                                                    : 'Coming soon'
                                            }
                                            onClick={() => setMenuOpen(false)}
                                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition md:w-auto ${focusRing} ${
                                                active
                                                    ? 'bg-[#006dfc]/10 font-semibold text-[#003079]'
                                                    : 'cursor-not-allowed text-slate-400'
                                            }`}
                                        >
                                            {label}

                                            {!active && (
                                                <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[0.65rem] font-medium text-slate-500">
                                                    Soon
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>

                        {/* Mobile back link */}
                        <Link
                            to="/"
                            onClick={() => setMenuOpen(false)}
                            className={`mt-2 inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-[#006dfc]/10 hover:text-[#006dfc] md:hidden ${focusRing}`}
                        >
                            Back to Website
                        </Link>
                    </nav>

                    {/* Desktop back link */}
                    <Link
                        to="/"
                        aria-label="Back to website"
                        className={`hidden shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-[#006dfc]/10 hover:text-[#006dfc] md:inline-flex ${focusRing}`}
                    >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                        <span className="hidden lg:inline">Back to Website</span>
                    </Link>
                </div>
            </header>

            <div ref={spacerRef} aria-hidden="true" />
        </>
    )
}

export default DashboardNavbar
