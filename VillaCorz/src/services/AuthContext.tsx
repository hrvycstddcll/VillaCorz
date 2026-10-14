import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react'
import { getUser, logout } from './authService'

type User = {
    id: number
    firstname: string
    lastname: string
    email: string
    role: string
}

type AuthContextType = {
    user: User | null
    loading: boolean
    refreshUser: () => Promise<void>
    setUser: (user: User | null) => void
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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

export const useAuth = () => {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }

    return context
}