import { Component, type ErrorInfo, type ReactNode } from 'react'
import StateModal from '../assets/components/ui/ModalComponents/StateModal'

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
            <StateModal
                state="somethingWentWrong"
                title="Something went wrong"
                description="VillaCorz hit an unexpected error while rendering this page. Reloading usually fixes it; if the problem persists, please contact support."
                details={
                    this.state.message ? (
                        <span className="block break-words font-mono">
                            {this.state.message}
                        </span>
                    ) : undefined
                }
                primaryLabel="Reload page"
                onPrimary={this.handleReload}
                secondaryLabel="Try again"
                onSecondary={this.handleReset}
            />
        )
    }
}

export default ErrorBoundary
