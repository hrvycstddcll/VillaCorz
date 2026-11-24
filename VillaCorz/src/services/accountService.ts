import api from './api'
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

export const updateAccountProfile = (
    firstname: string,
    lastname: string,
    currentPassword: string,
) =>
    api.put<AccountResponse>('/account/profile', {
        firstname,
        lastname,
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

export const requestPasswordResetCode = (email: string) =>
    api.post<PasswordResetResponse>('/forgot-password', { email })

export const resetAccountPassword = async (
    resetId: string,
    code: string,
    password: string,
    passwordConfirmation: string,
) =>
    api.post<AccountResponse>('/reset-password', {
        reset_id: resetId,
        code,
        password,
        password_confirmation: passwordConfirmation,
    })
