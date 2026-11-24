import { AxiosError } from 'axios'
import { authErrorMessage } from '../services/authErrors'

describe('authErrorMessage', () => {
    it('explains rate-limited login attempts', () => {
        const error = new AxiosError(
            'Request failed',
            'ERR_BAD_REQUEST',
            undefined,
            undefined,
            {
                status: 429,
                data: { message: 'Too Many Attempts.' },
                statusText: 'Too Many Requests',
                headers: {},
                config: {} as never,
            },
        )

        expect(authErrorMessage(error)).toBe(
            'Too many attempts. Please wait a minute and try again.',
        )
    })

    it('returns an ordinary error message', () => {
        expect(authErrorMessage(new Error('Unexpected auth failure'))).toBe(
            'Unexpected auth failure',
        )
    })
})
