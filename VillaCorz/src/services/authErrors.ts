import axios from 'axios'

export const authErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as {
            message?: string
            errors?: Record<string, string[]>
        } | undefined
        const validationError = Object.values(data?.errors ?? {}).flat()[0]

        if (validationError) return validationError
        if (!error.response) return 'Unable to connect to the server. Please try again.'
        if (error.response.status === 429) {
            return 'Too many attempts. Please wait a minute and try again.'
        }
        if (data?.message) return data.message

        return `Request failed (${error.response.status}). Please try again.`
    }

    return error instanceof Error && error.message
        ? error.message
        : 'Something went wrong. Please try again.'
}
