import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './assets/components/pages/Dashboard'
import HomePage from './assets/components/pages/HomePage'
import AboutUs from './assets/components/pages/AboutUs'
import Services from './assets/components/pages/Services'
import Navbar from './assets/components/ui/Navbar'
import Auth from './assets/components/auth/Auth'
import { AuthProvider } from './services/AuthContext'
import { useAuth } from './services/useAuth'
import { initSmoothScroll } from './lib/smoothScroll'

function AppRoutes() {
    const { user, loading } = useAuth()

    if (loading) {
        return null
    }
    return (
        <Routes>
            <Route
                path="/dashboard"
                element={
                    <>
                        <Dashboard />
                    </>
                }
            />
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
                    </>
                }
            />
            <Route 
                path="/auth" 
                element={user ? <Navigate to="/" replace /> : <Auth />}
            />
        </Routes>
    )
}


function App() {
    useEffect(() => initSmoothScroll(), [])

    return (
        <AuthProvider>
            <AppRoutes/>
        </AuthProvider>
    )
}

export default App