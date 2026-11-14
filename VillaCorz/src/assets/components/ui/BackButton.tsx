import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type BackButtonProps = {
    /** Route used when there is no in-app history to return to. */
    fallback?: string
    label?: string
    className?: string
}

const BackButton = ({
    fallback = '/',
    label = 'Back',
    className = '',
}: BackButtonProps) => {
    const navigate = useNavigate()

    const handleBack = () => {
        const historyIndex =
            (window.history.state as { idx?: number } | null)?.idx ?? 0

        if (historyIndex > 0) navigate(-1)
        else navigate(fallback)
    }

    return (
        <button
            type="button"
            onClick={handleBack}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#006dfc] px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] ${className}`.trim()}
        >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {label}
        </button>
    )
}

export default BackButton
