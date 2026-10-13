import api from './api'

export const login = (email: string, password: string) => {
    return api.post('/login', {
        email,
        password,
    })
}

export const register = (
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