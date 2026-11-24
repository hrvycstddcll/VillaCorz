import axios from "axios";

const configuredOrigin = import.meta.env.VITE_API_URL?.trim()

// Origin of the Laravel backend (no trailing slash, no /api suffix).
// In production the Vercel /api rewrite is used unless VITE_API_URL is set.
export const API_ORIGIN = configuredOrigin !== undefined
    ? configuredOrigin.replace(/\/+$/, '')
    : import.meta.env.DEV
        ? 'http://localhost:8000'
        : ''

export const API_BASE_URL = `${API_ORIGIN}/api`

export const TOKEN_STORAGE_KEY = 'villacorz.token'
export const USER_STORAGE_KEY = 'villacorz.user'
export const REMEMBER_STORAGE_KEY = 'villacorz.remember'
export const TOKEN_EXPIRY_STORAGE_KEY = 'villacorz.token_expires_at'

const stores = () => (typeof window === 'undefined' ? null : {
    session: window.sessionStorage,
    local: window.localStorage,
})

export const isRememberMeEnabled = (): boolean => {
    const storage = stores()
    return storage?.local.getItem(REMEMBER_STORAGE_KEY) === 'true'
}

const authStorage = (remember: boolean) => {
    const storage = stores()
    if (!storage) return null
    return remember ? storage.local : storage.session
}

export const getAuthToken = (): string | null => {
    const storage = stores()
    if (!storage) return null

    const preferred = authStorage(isRememberMeEnabled())
    return preferred?.getItem(TOKEN_STORAGE_KEY)
        ?? storage.session.getItem(TOKEN_STORAGE_KEY)
}

export const setAuthToken = (token: string, remember = false, expiresAt?: string | null) => {
    const storage = stores()
    if (!storage) return

    storage.session.removeItem(TOKEN_STORAGE_KEY)
    storage.local.removeItem(TOKEN_STORAGE_KEY)
    storage.session.removeItem(TOKEN_EXPIRY_STORAGE_KEY)
    storage.local.removeItem(TOKEN_EXPIRY_STORAGE_KEY)
    storage.local.setItem(REMEMBER_STORAGE_KEY, remember ? 'true' : 'false')

    const preferred = authStorage(remember)
    preferred?.setItem(TOKEN_STORAGE_KEY, token)
    if (expiresAt) {
        preferred?.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiresAt)
    }
}

export const clearAuthToken = () => {
    const storage = stores()
    if (!storage) return

    storage.session.removeItem(TOKEN_STORAGE_KEY)
    storage.local.removeItem(TOKEN_STORAGE_KEY)
    storage.session.removeItem(TOKEN_EXPIRY_STORAGE_KEY)
    storage.local.removeItem(TOKEN_EXPIRY_STORAGE_KEY)
    storage.local.removeItem(REMEMBER_STORAGE_KEY)
}

export const getCachedUser = <T,>(): T | null => {
    const storage = stores()
    if (!storage) return null

    const preferred = authStorage(isRememberMeEnabled())
    const raw = preferred?.getItem(USER_STORAGE_KEY)
        ?? storage.session.getItem(USER_STORAGE_KEY)
        ?? storage.local.getItem(USER_STORAGE_KEY)

    if (!raw) return null

    try {
        const parsed = JSON.parse(raw) as T
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
        return null
    }
}

export const setCachedUser = (user: unknown) => {
    const storage = stores()
    if (!storage) return

    const serialized = user ? JSON.stringify(user) : null
    const preferred = authStorage(isRememberMeEnabled())

    for (const store of [storage.session, storage.local]) {
        if (serialized && store === preferred) {
            store.setItem(USER_STORAGE_KEY, serialized)
        } else {
            store.removeItem(USER_STORAGE_KEY)
        }
    }
}

export const clearAuthState = () => {
    clearAuthToken()
    setCachedUser(null)
}

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
})

api.interceptors.request.use((config) => {
    const token = getAuthToken()

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            clearAuthState()
            window.dispatchEvent(new CustomEvent('villacorz:unauthorized'))
        }

        return Promise.reject(error)
    },
)

export default api
