import {
    clearAuthToken,
    getAuthToken,
    getCachedUser,
    setAuthToken,
    setCachedUser,
} from '../services/api'

describe('auth storage', () => {
    beforeEach(() => {
        window.localStorage.clear()
        window.sessionStorage.clear()
    })

    it('stores a normal session token only in sessionStorage', () => {
        setAuthToken('session-token')

        expect(getAuthToken()).toBe('session-token')
        expect(window.sessionStorage.getItem('villacorz.token')).toBe('session-token')
        expect(window.localStorage.getItem('villacorz.token')).toBeNull()
        expect(window.localStorage.getItem('villacorz.remember')).toBe('false')
    })

    it('stores a remembered token in localStorage', () => {
        setAuthToken('persistent-token', true, '2026-12-24T00:00:00+00:00')

        expect(getAuthToken()).toBe('persistent-token')
        expect(window.localStorage.getItem('villacorz.token')).toBe('persistent-token')
        expect(window.localStorage.getItem('villacorz.remember')).toBe('true')
        expect(window.localStorage.getItem('villacorz.token_expires_at')).toBe('2026-12-24T00:00:00+00:00')
        expect(window.sessionStorage.getItem('villacorz.token')).toBeNull()
    })

    it('clears token, expiry, and cached user from both stores', () => {
        setAuthToken('persistent-token', true)
        setCachedUser({ id: 7, role: 'customer' })

        clearAuthToken()
        setCachedUser(null)

        expect(getAuthToken()).toBeNull()
        expect(getCachedUser()).toBeNull()
        expect(window.localStorage.length).toBe(0)
        expect(window.sessionStorage.length).toBe(0)
    })

    it('reads the cached user from the preferred store', () => {
        setCachedUser({ id: 1, role: 'customer' })
        expect(getCachedUser()).toEqual({ id: 1, role: 'customer' })

        setAuthToken('persistent-token', true)
        setCachedUser({ id: 2, role: 'customer' })
        expect(getCachedUser()).toEqual({ id: 2, role: 'customer' })
    })
})
