import '@testing-library/jest-dom/vitest'

// MagicBento (admin dashboard) uses the browser observer APIs on mount.
if (typeof window !== 'undefined') {
    if (typeof window.ResizeObserver !== 'function') {
        Object.defineProperty(window, 'ResizeObserver', {
            configurable: true,
            writable: true,
            value: class {
                observe() {}
                unobserve() {}
                disconnect() {}
            },
        })
    }
    if (typeof window.IntersectionObserver !== 'function') {
        Object.defineProperty(window, 'IntersectionObserver', {
            configurable: true,
            writable: true,
            value: class {
                observe() {}
                unobserve() {}
                disconnect() {}
                takeRecords() {
                    return []
                }
            },
        })
    }
}

if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia !== 'function'
) {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: (query: string): MediaQueryList =>
            ({
                matches: false,
                media: query,
                onchange: null,
                addListener: () => {},
                removeListener: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => false,
            }) as MediaQueryList,
    })
}
