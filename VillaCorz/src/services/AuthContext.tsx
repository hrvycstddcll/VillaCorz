import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react'
import {
    getAuthToken,
    getCachedUser,
    REMEMBER_STORAGE_KEY,
    setCachedUser,
    TOKEN_STORAGE_KEY,
    USER_STORAGE_KEY,
} from './api'
import { getUser, logout } from './authService'
import type { User } from './types'
import { AuthContext } from './AuthContextValue'

const readCachedUser = (): User | null => {
    if (!getAuthToken()) {
        setCachedUser(null)
        return null
    }

    return getCachedUser<User>()
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // Hydrate from the session cache so the navbar renders the right menu on
    // the very first paint instead of popping it in after /user resolves.
    const [user, setUserState] = useState<User | null>(() => readCachedUser())
    const [loading, setLoading] = useState(true)

    const setUser = useCallback((nextUser: User | null) => {
        setCachedUser(nextUser)
        setUserState(nextUser)
    }, [])

    const refreshUser = useCallback(async () => {
        if (!getAuthToken()) {
            setUser(null)
            setLoading(false)
            return
        }

        try {
            const response = await getUser()
            setUser(response.data)
        } catch {
            setUser(null)
        } finally {
            setLoading(false)
        }
    }, [setUser])

    const handleLogout = async () => {
        try {
            await logout()
        } finally {
            setUser(null)
        }
    }

    const initializedRef = useRef(false)

    useEffect(() => {
        if (initializedRef.current) return
        initializedRef.current = true
        void refreshUser()
    }, [refreshUser])

    useEffect(() => {
        const handleUnauthorized = () => setUser(null)
        const handleStorage = (event: StorageEvent) => {
            if (![
                TOKEN_STORAGE_KEY,
                USER_STORAGE_KEY,
                REMEMBER_STORAGE_KEY,
            ].includes(event.key ?? '')) {
                return
            }

            if (getAuthToken()) {
                void refreshUser()
            } else {
                setUser(null)
            }
        }

        window.addEventListener('villacorz:unauthorized', handleUnauthorized)
        window.addEventListener('storage', handleStorage)

        return () => {
            window.removeEventListener('villacorz:unauthorized', handleUnauthorized)
            window.removeEventListener('storage', handleStorage)
        }
    }, [refreshUser, setUser])

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser, setUser, logout:handleLogout }}>
            {children}
        </AuthContext.Provider>
    )
}
