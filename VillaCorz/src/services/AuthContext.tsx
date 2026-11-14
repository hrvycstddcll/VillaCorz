import {
    useCallback,
    useEffect,
    useState,
    type ReactNode,
} from 'react'
import { getUser, logout } from './authService'
import type { User } from './types'
import { AuthContext } from './AuthContextValue'

const USER_CACHE_KEY = 'villacorz.user'

const readCachedUser = (): User | null => {
    if (typeof window === 'undefined') return null

    try {
        const raw = window.sessionStorage.getItem(USER_CACHE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as User
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
        return null
    }
}

const writeCachedUser = (user: User | null) => {
    if (typeof window === 'undefined') return

    try {
        if (user) {
            window.sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
        } else {
            window.sessionStorage.removeItem(USER_CACHE_KEY)
        }
    } catch {
        // Storage can be unavailable (private mode, quota); the in-memory
        // state below is still correct for this session.
    }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // Hydrate from the session cache so the navbar renders the right menu on
    // the very first paint instead of popping it in after /user resolves.
    const [user, setUserState] = useState<User | null>(() => readCachedUser())
    const [loading, setLoading] = useState(true)

    const setUser = useCallback((nextUser: User | null) => {
        writeCachedUser(nextUser)
        setUserState(nextUser)
    }, [])

    const refreshUser = useCallback(async () => {
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
    }, [refreshUser])

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser, setUser, logout:handleLogout }}>
            {children}
        </AuthContext.Provider>
    )
}
