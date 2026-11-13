import api from './api'
import type { ApiEnvelope, User, UserPhoneNumber } from './types'

type PhoneNumberMutationResponse = {
    success: boolean
    message: string
    phone_number: UserPhoneNumber
    user: User
}

type PhoneNumberUserResponse = {
    success: boolean
    message: string
    user: User
}

export type PhoneVerificationDelivery = {
    success: boolean
    message: string
    verification_delivery: 'email' | 'log'
    expires_in: number
    development_code?: string
}

export const getAccountPhoneNumbers = () =>
    api.get<ApiEnvelope<UserPhoneNumber[]>>('/account/phone-numbers')

export const addAccountPhoneNumber = (
    phoneNumber: string,
    isPrimary = false,
) =>
    api.post<PhoneNumberMutationResponse>('/account/phone-numbers', {
        phone_number: phoneNumber,
        is_primary: isPrimary,
    })

export const updateAccountPhoneNumber = (
    id: number,
    payload: { phone_number?: string; is_primary?: boolean },
) =>
    api.put<PhoneNumberMutationResponse>(
        `/account/phone-numbers/${id}`,
        payload,
    )

export const deleteAccountPhoneNumber = (id: number) =>
    api.delete<PhoneNumberUserResponse>(`/account/phone-numbers/${id}`)

export const sendPhoneNumberVerification = (id: number) =>
    api.post<PhoneVerificationDelivery>(
        `/account/phone-numbers/${id}/verification`,
    )

export const confirmPhoneNumberVerification = (id: number, otp: string) =>
    api.post<PhoneNumberMutationResponse>(
        `/account/phone-numbers/${id}/verification/confirm`,
        { otp },
    )