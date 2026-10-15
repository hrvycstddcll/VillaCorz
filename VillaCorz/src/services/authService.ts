import axios from 'axios'
import api from './api'

const csrf = () => {
    return axios.get('http://localhost:8000/sanctum/csrf-cookie', {
        withCredentials: true,
        withXSRFToken: true,
    })
}

export const login = async (email: string, password: string) => {
    await csrf()

    return api.post('/login', {
        email,
        password,
    })
}

export const logout = () => {
    return api.post('/logout')
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

    return api.post('/verify-otp', {
        registration_id: registrationId,
        otp,
    })
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