import { useEffect, useLayoutEffect, useRef } from 'react'
import {
    Routes,
    Route,
    Navigate,
    Outlet,
    useLocation,
} from 'react-router-dom'

import Dashboard from './assets/components/pages/Dashboard'
import Reports from './assets/components/pages/Reports'
import HomePage from './assets/components/pages/HomePage'
import AboutUs from './assets/components/pages/AboutUs'
import Services from './assets/components/pages/Services'
import MyBookings from './assets/components/pages/MyBookings'
import Payment from './assets/components/pages/Payment'
import AccountSettings from './assets/components/pages/AccountSettings'
import SettingsHub from './assets/components/pages/SettingsHub'
import PasswordRecovery from './assets/components/pages/PasswordRecovery'
import ManageOffers from './assets/components/pages/Offers'
import Contact from './assets/components/pages/Contact'
import Navbar from './assets/components/ui/Navbar'
import Auth from './assets/components/auth/Auth'
import { AuthProvider } from './services/AuthContext'
import { useAuth } from './services/useAuth'
import {
    initSmoothScroll,
    scrollToHash,
    scrollToTop,
} from './lib/smoothScroll'

const HASH_SCROLL_RESIZE_SETTLE_MS = 300

function LoadingPanel() {
    return (
        <div className="grid min-h-svh place-items-center p-6 pt-24">
            <p className="text-center text-sm text-slate-500">Loading...</p>
        </div>
    )
}

function AdminRoute() {
    const { user } = useAuth()
    const location = useLocation()

    if (!user) {
        return (
            <Navigate
                to="/auth?mode=login"
                state={{ from: location }}
                replace
            />
        )
    }

    if (user.role !== 'admin') {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}

function AuthenticatedRoute() {
    const { user } = useAuth()
    const location = useLocation()

    if (!user) {
        return (
            <Navigate
                to="/auth?mode=login"
                state={{ from: location }}
                replace
            />
        )
    }

    return <Outlet />
}

function NavbarSpacer() {
    const spacerRef = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        const nav = document.getElementById('primary-nav')
        const spacer = spacerRef.current
        if (!nav || !spacer) return

        const root = document.documentElement

        const sync = () => {
            const height = nav.getBoundingClientRect().height
            spacer.style.height = `${height}px`
            root.style.setProperty('--navbar-height', `${height}px`)
        }

        sync()
        const observer = new ResizeObserver(sync)
        observer.observe(nav)

        return () => observer.disconnect()
    }, [])

    return <div ref={spacerRef} aria-hidden="true" />
}

function AdminLayout() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <NavbarSpacer />
            <Outlet />
        </div>
    )
}

function HashScroll() {
    const location = useLocation()
    const { loading } = useAuth()

    useEffect(() => {
        if (loading) return

        if (!location.hash) {
            scrollToTop()
            return
        }

        // Let Lenis finish its debounced resize after route content mounts;
        // a resize during its scroll animation resets the animation target.
        let frame = 0
        let cancelled = false
        let animationFrame: number | undefined

        const attempt = () => {
            if (cancelled) return
            if (scrollToHash(location.hash)) return
            if (frame >= 30) return
            frame += 1
            animationFrame = requestAnimationFrame(attempt)
        }

        const timeout = window.setTimeout(
            attempt,
            HASH_SCROLL_RESIZE_SETTLE_MS,
        )

        return () => {
            cancelled = true
            window.clearTimeout(timeout)
            if (animationFrame !== undefined) {
                cancelAnimationFrame(animationFrame)
            }
        }
    }, [location.pathname, location.hash, location.key, loading])

    return null
}

function SiteLayout() {
    const { loading } = useAuth()
    const { pathname } = useLocation()
    const hidePaymentChrome = pathname.startsWith('/payment')
    const hideNavbar =
        pathname === '/auth' ||
        pathname === '/account/settings' ||
        pathname === '/settings' ||
        pathname === '/bookings' ||
        pathname === '/reservation' ||
        hidePaymentChrome

    return (
        <>
            {!hideNavbar && <Navbar />}
            <HashScroll />
            {loading ? <LoadingPanel /> : <Outlet />}
        </>
    )
}

function AuthRoute() {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return <LoadingPanel />
    }

    if (user) {
        const from = (
            location.state as {
                from?: {
                    pathname?: string
                    search?: string
                    hash?: string
                    state?: unknown
                }
            } | null
        )?.from
        const returnToBooking =
            from?.pathname === '/reservation' ||
            from?.pathname?.startsWith('/payment')

        return (
            <Navigate
                to={
                    returnToBooking && from
                        ? {
                              pathname: from.pathname,
                              search: from.search,
                              hash: from.hash,
                          }
                        : user.role === 'admin'
                          ? '/dashboard'
                          : '/'
                }
                state={returnToBooking ? from?.state : undefined}
                replace
            />
        )
    }

    return <Auth />
}

function AppRoutes() {
    return (
        <Routes>
            <Route element={<SiteLayout />}>
                <Route element={<AdminRoute />}>
                    <Route element={<AdminLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route
                            path="/manageOffers"
                            element={<ManageOffers />}
                        />
                        <Route path="/reports" element={<Reports />} />
                    </Route>
                </Route>

                <Route path="/services" element={<Services />} />
                <Route path="/forgot-password" element={<PasswordRecovery />} />
                <Route element={<AuthenticatedRoute />}>
                    <Route
                        path="/reservation"
                        element={<Services reservationOnly />}
                    />
                    <Route path="/bookings" element={<MyBookings />} />
                    <Route path="/settings" element={<SettingsHub />} />
                    <Route path="/payment" element={<Navigate to="/services" replace />} />
                    <Route path="/payment/:reference" element={<Payment />} />
                    <Route path="/account/settings" element={<AccountSettings />} />
                </Route>
                <Route path="/home" element={<Navigate to="/" replace />} />

                <Route
                    path="/"
                    element={
                        <>
                            <HomePage />
                            <Services bookingOnly />
                            <AboutUs />
                            <Contact />
                        </>
                    }
                />

                <Route path="/auth" element={<AuthRoute />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    )
}

function App() {
    useEffect(() => initSmoothScroll(), [])

    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    )
}

export default App
