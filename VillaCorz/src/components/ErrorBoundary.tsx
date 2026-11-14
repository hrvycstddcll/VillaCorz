import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
    children: ReactNode
}

type ErrorBoundaryState = {
    hasError: boolean
    message: string | null
}

/**
 * Last-resort boundary so an unhandled render error shows a recoverable
 * screen instead of a blank page. Errors are logged to the console for
 * developers; end users get a reload prompt.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, message: null }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, message: error?.message ?? null }
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('VillaCorz render error:', error, info.componentStack)
    }

    handleReload = () => {
        window.location.reload()
    }

    handleReset = () => {
        this.setState({ hasError: false, message: null })
    }

    render() {
        if (!this.state.hasError) return this.props.children

        return (
            <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center font-poppins">
                <h1 className="font-serif text-3xl font-bold text-[#003079]">
                    Something went wrong
                </h1>
                <p className="max-w-md text-sm leading-6 text-slate-600">
                    VillaCorz hit an unexpected error while rendering this page.
                    Reloading usually fixes it; if the problem persists, please
                    contact support.
                </p>
                {this.state.message && (
                    <p className="max-w-md rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-xs text-slate-500">
                        {this.state.message}
                    </p>
                )}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={this.handleReset}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                    >
                        Try again
                    </button>
                    <button
                        type="button"
                        onClick={this.handleReload}
                        className="rounded-lg bg-[#006dfc] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                    >
                        Reload page
                    </button>
                </div>
            </main>
        )
    }
}

export default ErrorBoundary
