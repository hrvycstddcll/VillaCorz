const PH_MOBILE = /^\+639\d{9}$/
const INTERNATIONAL = /^\+[1-9]\d{7,14}$/
const NATIONAL_LENGTH = 10

export const PH_NATIONAL_PATTERN = '9[0-9]{2} [0-9]{3} [0-9]{4}'

/**
 * Mirrors the backend PhoneNumber helper: local numbers are treated as
 * Philippine mobiles and converted to E.164, while explicit international
 * numbers are kept in E.164. Returns null when the input cannot be a valid
 * number.
 */
export const normalizePhoneNumber = (value: string): string | null => {
    let trimmed = value.trim()

    if (!trimmed) return null

    const international = trimmed.startsWith('+') || trimmed.startsWith('00')

    if (trimmed.startsWith('00')) {
        trimmed = `+${trimmed.slice(2)}`
    }

    const digits = trimmed.replace(/\D+/g, '')

    if (!digits) return null

    let e164: string

    if (international) {
        e164 = `+${digits}`
    } else if (digits.startsWith('63') && digits.length === 12) {
        e164 = `+${digits}`
    } else if (digits.startsWith('0')) {
        e164 = `+63${digits.slice(1)}`
    } else {
        e164 = `+63${digits}`
    }

    if (e164.startsWith('+63')) {
        return PH_MOBILE.test(e164) ? e164 : null
    }

    return INTERNATIONAL.test(e164) ? e164 : null
}

/**
 * Human-friendly display for a canonical number. Invalid input is returned
 * unchanged so the field never silently changes an unfinished entry.
 */
export const formatPhoneNumber = (value: string): string => {
    const normalized = normalizePhoneNumber(value)

    if (!normalized) return value

    if (normalized.startsWith('+63')) {
        const national = normalized.slice(3)

        return `+63 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6, 10)}`
    }

    return normalized
}

/**
 * Semi-encrypted display for account/payment screens. PH numbers keep the
 * country code, the leading mobile digit, and the last four digits.
 */
export const maskPhoneNumber = (value: string): string => {
    const normalized = normalizePhoneNumber(value)

    if (!normalized) return value

    if (normalized.startsWith('+63')) {
        const national = normalized.slice(3)

        return `+63 ${national.slice(0, 1)}•• ••• ${national.slice(-4)}`
    }

    return `${normalized.slice(0, 4)}••••${normalized.slice(-4)}`
}

/**
 * Keep only the 10 national digits for the fixed +63 input. Pasting a full
 * number (with +63, 63, 0, or 00) is normalized back to the national part.
 */
export const nationalMobileDigits = (value: string): string => {
    let digits = value.replace(/\D+/g, '')

    if (digits.startsWith('00')) {
        digits = digits.slice(2)
    }

    if (digits.length > NATIONAL_LENGTH && digits.startsWith('63')) {
        digits = digits.slice(2)
    }

    if (digits.length > NATIONAL_LENGTH && digits.startsWith('0')) {
        digits = digits.slice(1)
    }

    return digits.slice(0, NATIONAL_LENGTH)
}

/** Format national digits as 9XX XXX XXXX while the guest is typing. */
export const formatNationalMobile = (digits: string): string => {
    const national = digits.slice(0, NATIONAL_LENGTH)

    if (national.length <= 3) return national
    if (national.length <= 6) return `${national.slice(0, 3)} ${national.slice(3)}`

    return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`
}