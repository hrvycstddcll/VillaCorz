import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './assets/components/pages/HomePage'
import Navbar from './assets/components/ui/Navbar'
import Auth from './assets/components/auth/Auth'
import { AuthProvider, useAuth } from './services/AuthContext'

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
    return (
        <AuthProvider>
            <AppRoutes/>
        </AuthProvider>
    )
}

export default App