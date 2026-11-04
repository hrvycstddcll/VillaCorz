import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './assets/components/pages/HomePage'
import AboutUs from './assets/components/pages/AboutUs'
import Navbar from './assets/components/ui/Navbar'
import Auth from './assets/components/auth/Auth'
import { AuthProvider, useAuth } from './services/AuthContext'
import { initSmoothScroll } from './lib/smoothScroll'

function AppRoutes() {
    const { user, loading } = useAuth()

    if (loading) {
        return null
    }
    return (
        <Routes>
            <Route
                path="/"
                element={
                    <>
                        <Navbar />
                        <HomePage />
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