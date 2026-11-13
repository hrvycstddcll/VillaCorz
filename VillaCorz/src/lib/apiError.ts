export const getApiErrorMessage = (error: unknown, fallback: string) => {
    const responseData = (
        error as {
            response?: {
                data?: {
                    message?: string
                    errors?: Record<string, string[]>
                }
            }
        }
    )?.response?.data

    const firstError = responseData?.errors
        ? Object.values(responseData.errors)[0]?.[0]
        : undefined

    return firstError || responseData?.message || fallback
}
