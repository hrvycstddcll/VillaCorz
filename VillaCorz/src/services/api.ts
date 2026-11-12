import axios from "axios";

const configuredOrigin = import.meta.env.VITE_API_URL?.trim()

// Origin of the Laravel backend (no trailing slash, no /api suffix).
// Override with VITE_API_URL in a local .env file when the backend is not
// running on the default port.
export const API_ORIGIN = (configuredOrigin || 'http://localhost:8000').replace(/\/+$/, '')

export const API_BASE_URL = `${API_ORIGIN}/api`

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    withXSRFToken: true,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
})

export default api
