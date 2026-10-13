import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './assets/components/pages/HomePage'
import Navbar from './assets/components/ui/Navbar'
import Auth from './assets/components/auth/Auth'
import { AuthProvider } from './services/AuthContext'

function App() {
    return (
        <AuthProvider>
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

                <Route path="/auth" element={<Auth />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    )
}

export default App