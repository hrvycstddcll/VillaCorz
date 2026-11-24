type PostAuthLocationState = {
    from?: {
        pathname?: string
        search?: string
        hash?: string
        state?: unknown
    }
}

const isAdminUser = (user: unknown): boolean =>
    typeof user === 'object'
    && user !== null
    && typeof (user as { role?: unknown }).role === 'string'
    && (user as { role?: string }).role === 'admin'

export const getPostAuthDestination = (
    user: unknown,
    state: unknown,
): { pathname: string; search?: string; hash?: string } => {
    const requested = (state as PostAuthLocationState | null)?.from
    const path = requested?.pathname
    const customerPrefixes = ['/reservation', '/payment', '/bookings', '/settings']
    const adminPrefixes = [...customerPrefixes, '/dashboard', '/manageOffers', '/reports']
    const prefixes = isAdminUser(user) ? adminPrefixes : customerPrefixes
    const canRestore = path
        ? prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
        : false

    if (canRestore && path) {
        return {
            pathname: path,
            search: requested?.search,
            hash: requested?.hash,
        }
    }

    return { pathname: isAdminUser(user) ? '/dashboard' : '/' }
}
