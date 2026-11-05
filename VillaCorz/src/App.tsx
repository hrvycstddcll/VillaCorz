import { useEffect } from 'react'
import {
    Routes,
    Route,
    Navigate,
    useLocation,
} from 'react-router-dom'

import Dashboard from './assets/components/pages/Dashboard'
import HomePage from './assets/components/pages/HomePage'
import AboutUs from './assets/components/pages/AboutUs'
import Services from './assets/components/pages/Services'
import Contact from './assets/components/pages/Contact'
import Navbar from './assets/components/ui/Navbar'
import Auth from './assets/components/auth/Auth'
import { AuthProvider } from './services/AuthContext'
import { useAuth } from './services/useAuth'
import { initSmoothScroll } from './lib/smoothScroll'

function AdminRoute() {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <>  
                <Navbar />
                <p className="p-6 text-center">Loading...</p>
            </>
        )
    }

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

    return <Dashboard />
}

function AppRoutes() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <>  
                <Navbar />
                <p className="p-6 text-center">Loading...</p>
            </>
        )
    }

    return (
        <Routes>
            <Route path="/admin" element={<AdminRoute />} />

            <Route
                path="/services"
                element={
                    <>
                        <Navbar />
                        <Services />
                    </>
                }
            />

            <Route
                path="/"
                element={
                    <>
                        <Navbar />
                        <HomePage />
                        <Services bookingOnly />
                        <AboutUs />
                        <Contact />
                    </>
                }
            />

            <Route
                path="/auth"
                element={
                    user ? (
                        <Navigate
                            to={user.role === 'admin' ? '/admin' : '/'}
                            replace
                        />
                    ) : (
                        <Auth />
                    )
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
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