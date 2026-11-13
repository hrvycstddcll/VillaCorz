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
import Payment from './assets/components/pages/Payment'
import AccountSettings from './assets/components/pages/AccountSettings'
import PasswordRecovery from './assets/components/pages/PasswordRecovery'
import ManageOffers from './assets/components/pages/Offers'
import Contact from './assets/components/pages/Contact'
import Navbar from './assets/components/ui/Navbar'
import SettingsNotch from './assets/components/ui/SettingsNotch'
import Auth from './assets/components/auth/Auth'
import { AuthProvider } from './services/AuthContext'
import { useAuth } from './services/useAuth'
import {
    initSmoothScroll,
    scrollToHash,
    scrollToTop,
} from './lib/smoothScroll'

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
            <SettingsNotch />
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

        // Sections can mount a frame or two after the route does, so retry
        // briefly instead of silently skipping the scroll.
        let frame = 0
        let cancelled = false

        const attempt = () => {
            if (cancelled) return
            if (scrollToHash(location.hash)) return
            if (frame >= 30) return
            frame += 1
            requestAnimationFrame(attempt)
        }

        attempt()

        return () => {
            cancelled = true
        }
    }, [location.pathname, location.hash, location.key, loading])

    return null
}

function SiteLayout() {
    const { loading } = useAuth()
    const { pathname } = useLocation()
    const hideNavbar = pathname === '/auth' || pathname === '/account/settings'

    return (
        <>
            {!hideNavbar && <Navbar />}
            <HashScroll />
            {loading ? <LoadingPanel /> : <Outlet />}
            <SettingsNotch />
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
            from?.pathname === '/reservation' || from?.pathname === '/payment'

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
                <Route path="/payment/confirm" element={<Payment />} />
                <Route path="/forgot-password" element={<PasswordRecovery />} />
                <Route element={<AuthenticatedRoute />}>
                    <Route
                        path="/reservation"
                        element={<Services reservationOnly />}
                    />
                    <Route path="/payment" element={<Payment />} />
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
