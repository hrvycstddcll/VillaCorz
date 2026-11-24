import axios from 'axios'
import api, { API_ORIGIN, clearAuthToken, setAuthToken } from './api'

const csrf = () => {
    return axios.get(`${API_ORIGIN}/sanctum/csrf-cookie`, {
        withCredentials: true,
        withXSRFToken: true,
    })
}

export const login = async (email: string, password: string) => {
    await csrf()

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
    await csrf()

    return api.post('/register', {
        firstname,
        lastname,
        email,
        password,
    })
}

export const verifyOtp = async (registrationId: string, otp: string) => {
    await csrf()

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
    await csrf()

    return api.post('/resend-otp', {
        registration_id: registrationId,
    })
}

export const getUser = () => {
    return api.get('/user')
}