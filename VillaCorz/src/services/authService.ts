import api, { clearAuthState, setAuthToken } from './api'

export const login = async (email: string, password: string, remember = false) => {
    const response = await api.post('/login', {
        email,
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
        return await api.post('/logout')
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
        email,
        password,
    })
}

export const verifyOtp = async (registrationId: string, otp: string, remember = false) => {
    const response = await api.post('/verify-otp', {
        registration_id: registrationId,
        otp,
        remember,
    })

    const token = response.data?.token
    if (typeof token === 'string' && token) {
        setAuthToken(token, remember, response.data?.expires_at)
    }

    return response
}

export const resendOtp = async (registrationId: string) => {
    return api.post('/resend-otp', {
        registration_id: registrationId,
    })
}

export const getUser = () => {
    return api.get('/user')
}