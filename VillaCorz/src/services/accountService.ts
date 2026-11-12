import axios from 'axios'
import api, { API_ORIGIN } from './api'
import type { User } from './types'

type AccountResponse = {
    message: string
    user?: User
}

type PasswordResetResponse = {
    message: string
    reset_id: string
    expires_in: number
    development_code?: string
}

const requestCsrfCookie = () =>
    axios.get(`${API_ORIGIN}/sanctum/csrf-cookie`, {
        withCredentials: true,
        withXSRFToken: true,
    })

export const updateAccountProfile = (
    firstname: string,
    lastname: string,
    phoneNumber: string,
    currentPassword: string,
) =>
    api.put<AccountResponse>('/account/profile', {
        firstname,
        lastname,
        phone_number: phoneNumber || null,
        current_password: currentPassword,
    })

export const updateAccountPassword = (
    currentPassword: string,
    password: string,
    passwordConfirmation: string,
) =>
    api.put<AccountResponse>('/account/password', {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
    })

export const requestPasswordResetCode = async (email: string) => {
    await requestCsrfCookie()
    return api.post<PasswordResetResponse>('/forgot-password', { email })
}

export const resetAccountPassword = async (
    resetId: string,
    code: string,
    password: string,
    passwordConfirmation: string,
) => {
    await requestCsrfCookie()
    return api.post<AccountResponse>('/reset-password', {
        reset_id: resetId,
        code,
        password,
        password_confirmation: passwordConfirmation,
    })
}
