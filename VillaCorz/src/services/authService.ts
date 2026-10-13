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

export const getUser = () => {
    return api.get('/user')
}