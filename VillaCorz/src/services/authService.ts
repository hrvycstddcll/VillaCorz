import api, { clearAuthToken, setAuthToken } from './api'

export const login = async (email: string, password: string) => {
    const response = await api.post('/login', {
        email,
        password,
    })

    const token = response.data?.token
    if (typeof token === 'string' && token) {
        setAuthToken(token)
    }

    return response
}

export const logout = async () => {
    try {
        return await api.post('/logout')
    } finally {
        clearAuthToken()
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

export const verifyOtp = async (registrationId: string, otp: string) => {
    const response = await api.post('/verify-otp', {
        registration_id: registrationId,
        otp,
    })

    const token = response.data?.token
    if (typeof token === 'string' && token) {
        setAuthToken(token)
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