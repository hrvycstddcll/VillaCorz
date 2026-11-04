import {
    useEffect,
    useState,
    type ReactNode,
} from 'react'
import { getUser, logout } from './authService'
import type { User } from './types'
import { AuthContext } from './AuthContextValue'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    const refreshUser = async () => {
        try {
            const response = await getUser()
            setUser(response.data)
        } catch {
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await logout()
        setUser(null)
    }

    useEffect(() => {
        const init = async () => {
            try {
                await refreshUser()
            } catch {
                // ignore
            }
        }
        void init()
    }, [])

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser, setUser, logout:handleLogout }}>
            {children}
        </AuthContext.Provider>
    )
}