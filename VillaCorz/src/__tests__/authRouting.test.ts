import { getPostAuthDestination } from '../services/authRouting'

describe('getPostAuthDestination', () => {
    it('sends admins to the dashboard', () => {
        expect(getPostAuthDestination({ role: 'admin' }, null)).toEqual({
            pathname: '/dashboard',
        })
    })

    it('sends customers home', () => {
        expect(getPostAuthDestination({ role: 'customer' }, null)).toEqual({
            pathname: '/',
        })
    })

    it('does not read role from an undefined user', () => {
        expect(getPostAuthDestination(undefined, null)).toEqual({ pathname: '/' })
    })
})
