import { normalizeEmail } from '../services/authService'

describe('normalizeEmail', () => {
    it('trims and lowercases email addresses', () => {
        expect(normalizeEmail('  Harvey.Custodio@Example.Com  ')).toBe(
            'harvey.custodio@example.com',
        )
    })
})
