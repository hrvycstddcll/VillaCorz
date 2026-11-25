import { beforeEach, describe, expect, test } from 'vitest'
import {
    clearPendingVerification,
    loadPendingVerification,
    savePendingVerification,
} from '../services/pendingVerification'

const pending = {
    registrationId: '6b3f9e6c-3b4a-4d9b-8f4e-1f2a3b4c5d6e',
    email: 'guest@example.com',
    expiresAt: Date.now() + 600_000,
    delivery: 'email' as const,
    developmentCode: null,
    remember: true,
}

beforeEach(() => {
    window.sessionStorage.clear()
})

describe('pending verification storage', () => {
    test('round-trips a pending registration', () => {
        savePendingVerification(pending)
        expect(loadPendingVerification()).toEqual(pending)
    })

    test('clears a pending registration on request', () => {
        savePendingVerification(pending)
        clearPendingVerification()
        expect(loadPendingVerification()).toBeNull()
    })

    test('drops expired pending registrations', () => {
        savePendingVerification({ ...pending, expiresAt: Date.now() - 1000 })
        expect(loadPendingVerification()).toBeNull()
        expect(window.sessionStorage.getItem('villacorz.pending_verification')).toBeNull()
    })

    test('drops malformed pending registrations', () => {
        window.sessionStorage.setItem('villacorz.pending_verification', '{bad json')
        expect(loadPendingVerification()).toBeNull()
        expect(window.sessionStorage.getItem('villacorz.pending_verification')).toBeNull()
    })
})
