import axios from "axios";

const configuredOrigin = import.meta.env.VITE_API_URL?.trim()

// Origin of the Laravel backend (no trailing slash, no /api suffix).
// Override with VITE_API_URL in a local .env file when the backend is not
// running on the default port.
export const API_ORIGIN = (configuredOrigin ?? 'http://localhost:8000').replace(/\/+$/, '')

export const API_BASE_URL = `${API_ORIGIN}/api`

export const TOKEN_STORAGE_KEY = 'villacorz.token'
export const USER_STORAGE_KEY = 'villacorz.user'

export const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null

    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY)
}

export const setAuthToken = (token: string) => {
    if (typeof window === 'undefined') return

    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export const clearAuthToken = () => {
    if (typeof window === 'undefined') return

    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY)
}

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    withXSRFToken: true,
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
            window.sessionStorage.removeItem(TOKEN_STORAGE_KEY)
            window.sessionStorage.removeItem(USER_STORAGE_KEY)
            window.dispatchEvent(new CustomEvent('villacorz:unauthorized'))
        }

        return Promise.reject(error)
    },
)

export default api
