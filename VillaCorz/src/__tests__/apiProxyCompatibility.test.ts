import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import api, {
    getAuthToken,
    setAuthToken,
    TOKEN_FALLBACK_HEADER,
} from '../services/api'

describe('api proxy compatibility', () => {
    const originalAdapter = api.defaults.adapter

    const jsonResponse = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({
        data,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        headers: {},
        config,
    })

    afterEach(() => {
        api.defaults.adapter = originalAdapter
        window.localStorage.clear()
        window.sessionStorage.clear()
        vi.restoreAllMocks()
    })

    it('sends the token in both authorization and fallback headers', async () => {
        const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => jsonResponse(config, { success: true }))
        api.defaults.adapter = adapter as AxiosAdapter
        setAuthToken('token-123')

        await api.get('/user')

        const config = adapter.mock.calls[0][0] as InternalAxiosRequestConfig
        expect(config.headers.get('Authorization')).toBe('Bearer token-123')
        expect(config.headers.get(TOKEN_FALLBACK_HEADER)).toBe('token-123')
    })

    it('rejects success=false envelopes returned with HTTP 200', async () => {
        api.defaults.adapter = (async (config: InternalAxiosRequestConfig) => jsonResponse(config, {
            success: false,
            message: 'Unauthenticated.',
        })) as AxiosAdapter

        setAuthToken('token-123')
        const unauthorized = vi.fn()
        window.addEventListener('villacorz:unauthorized', unauthorized)

        await expect(api.get('/user')).rejects.toMatchObject({
            message: 'Unauthenticated.',
            response: { status: 200, data: { success: false } },
        })

        expect(unauthorized).toHaveBeenCalledOnce()
        expect(getAuthToken()).toBeNull()
        window.removeEventListener('villacorz:unauthorized', unauthorized)
    })
})
