export type PendingVerification = {
    registrationId: string
    email: string
    expiresAt: number
    delivery: 'email' | 'log'
    developmentCode: string | null
    remember: boolean
}

const STORAGE_KEY = 'villacorz.pending_verification'

const isPendingVerification = (value: unknown): value is PendingVerification => {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Record<string, unknown>
    return typeof candidate.registrationId === 'string'
        && candidate.registrationId.length > 0
        && typeof candidate.email === 'string'
        && candidate.email.length > 0
        && typeof candidate.expiresAt === 'number'
        && Number.isFinite(candidate.expiresAt)
        && (candidate.delivery === 'email' || candidate.delivery === 'log')
        && (candidate.developmentCode === null || typeof candidate.developmentCode === 'string')
        && typeof candidate.remember === 'boolean'
}

export const savePendingVerification = (pending: PendingVerification): void => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending))
}

export const loadPendingVerification = (): PendingVerification | null => {
    if (typeof window === 'undefined') return null

    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    try {
        const parsed: unknown = JSON.parse(raw)
        if (!isPendingVerification(parsed)) {
            clearPendingVerification()
            return null
        }
        if (parsed.expiresAt <= Date.now()) {
            clearPendingVerification()
            return null
        }
        return parsed
    } catch {
        clearPendingVerification()
        return null
    }
}

export const clearPendingVerification = (): void => {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(STORAGE_KEY)
}
