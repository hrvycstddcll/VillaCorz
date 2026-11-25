import api, { clearAuthState, setAuthToken } from './api'

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const login = async (email: string, password: string, remember = false) => {
    const response = await api.post('/login', {
        email: normalizeEmail(email),
        password,
        remember,
    })

    const token = response.data?.token
    if (typeof token === 'string' && token) {
        setAuthToken(token, remember, response.data?.expires_at)
    }

    return response
}

export const logout = async () => {
    try {
        await api.post('/logout')
    } catch (error) {
        void error
    } finally {
        clearAuthState()
    }
}

export const register = async (
    firstname: string,
    lastname: string,
    email: string,
    password: string,
) => {
    return api.post('/register', {
        firstname,
        lastname,
        email: normalizeEmail(email),
        password,
    })
}

export const verifyOtp = async (registrationId: string, otp: string, remember = false) => {
    return api.post('/verify-otp', {
        registration_id: registrationId,
        otp,
        remember,
    })
}

export const resendOtp = async (registrationId: string) => {
    return api.post('/resend-otp', {
        registration_id: registrationId,
    })
}

export const getUser = () => {
    return api.get('/user')
}