import axios from 'axios'

export const getApiErrorMessage = (
    error: unknown,
    fallback = 'Something went wrong. Please try again.',
) => {
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
            return 'Your session has expired. Please sign in again.'
        }
        if (error.response?.status === 403) {
            return 'You do not have permission to perform this action.'
        }
        const data = error.response?.data as { message?: string } | undefined
        if (data?.message) return data.message
    }

    return fallback
}
