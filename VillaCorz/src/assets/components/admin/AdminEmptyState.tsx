import type { ComponentType, SVGProps } from 'react'
import { Link } from 'react-router-dom'

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

type AdminEmptyStateProps = {
    icon: LucideIcon
    heading: string
    subtitle: string
    ctaLabel?: string
    onAction?: () => void
    href?: string
}

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const AdminEmptyState = ({
    icon: Icon,
    heading,
    subtitle,
    ctaLabel,
    onAction,
    href,
}: AdminEmptyStateProps) => (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <span
            className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500"
            aria-hidden="true"
        >
            <Icon className="size-5" />
        </span>
        <p className="mt-4 font-serif text-xl font-semibold text-slate-900">
            {heading}
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-pretty text-sm leading-6 text-slate-500">
            {subtitle}
        </p>
        {ctaLabel && href && (
            <Link
                to={href}
                className={`mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#006dfc] px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#0057c9] ${focusRing}`}
            >
                {ctaLabel}
            </Link>
        )}
        {ctaLabel && onAction && (
            <button
                type="button"
                onClick={onAction}
                className={`mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#006dfc] px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#0057c9] ${focusRing}`}
            >
                {ctaLabel}
            </button>
        )}
    </div>
)

export default AdminEmptyState
