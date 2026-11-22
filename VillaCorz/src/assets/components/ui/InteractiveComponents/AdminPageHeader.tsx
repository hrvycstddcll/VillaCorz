import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type AdminPageHeaderProps = {
    eyebrow: string
    title: string
    titleClassName?: string
    subtitle?: string
    action?: ReactNode
    hero?: {
        label: string
        value: string
        delta?: { delta: number; percent: number | null }
        href?: string
    }
}

const deltaText = (delta: { delta: number; percent: number | null }) => {
    if (delta.percent !== null) {
        const sign = delta.percent > 0 ? '+' : ''
        return `${sign}${delta.percent}%`
    }

    return `${delta.delta > 0 ? '+' : ''}${delta.delta}`
}

const heroValueClass =
    'font-jakarta-serif text-5xl font-bold leading-none tracking-tight text-slate-950 tabular-nums sm:text-6xl'

const AdminPageHeader = ({
    eyebrow,
    title,
    titleClassName,
    subtitle,
    action,
    hero,
}: AdminPageHeaderProps) => (
    <header className="flex flex-col gap-6 border-b border-[rgba(0,0,0,0.06)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {eyebrow}
            </p>
            <h1
                className={`mt-2 text-balance font-jakarta-serif text-3xl font-bold tracking-tight sm:text-4xl ${
                    titleClassName ?? 'text-slate-950'
                }`}
            >
                {title}
            </h1>
            {subtitle && (
                <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-slate-600">
                    {subtitle}
                </p>
            )}
            {hero && (
                <div className="mt-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {hero.label}
                    </p>
                    {hero.href ? (
                        <Link
                            to={hero.href}
                            className={`mt-2 inline-block rounded-sm hover:text-[#006dfc] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#006dfc] ${heroValueClass}`}
                        >
                            {hero.value}
                        </Link>
                    ) : (
                        <p className={`mt-2 ${heroValueClass}`}>{hero.value}</p>
                    )}
                    {hero.delta && (
                        <p
                            className={`mt-2 font-mono text-xs font-medium tabular-nums ${
                                hero.delta.delta > 0
                                    ? 'text-emerald-700'
                                    : hero.delta.delta < 0
                                      ? 'text-rose-700'
                                      : 'text-slate-500'
                            }`}
                        >
                            {deltaText(hero.delta)} <span className="text-slate-500">vs prior period</span>
                        </p>
                    )}
                </div>
            )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
)

export default AdminPageHeader
