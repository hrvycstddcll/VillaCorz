import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type AdminStat = {
    label: string
    value: string
    delta?: { value: number; percent: number | null }
    suffix?: string
    href?: string
    onClick?: () => void
}

type AdminStatStripProps = {
    stats: AdminStat[]
    className?: string
    children?: ReactNode
}

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const deltaTone = (val: number) =>
    val > 0 ? 'text-emerald-700' : val < 0 ? 'text-rose-700' : 'text-slate-500'

const deltaText = (d: { value: number; percent: number | null }) => {
    if (d.percent !== null) {
        const sign = d.percent > 0 ? '+' : ''
        return `${sign}${d.percent}%`
    }
    const sign = d.value >= 0 ? '+' : ''
    return `${sign}${d.value}`
}

const AdminStatStrip = ({ stats, className = '', children }: AdminStatStripProps) => (
    <div
        role="group"
        aria-label="Key metrics"
        className={`flex flex-wrap items-stretch gap-x-4 gap-y-1 ${className}`}
    >
        {stats.map((stat) => (
            <div key={stat.label} className="flex">
                {stat.href ? (
                    <Link
                        to={stat.href}
                        className={`flex min-h-11 items-center gap-1.5 rounded-sm px-1 text-left hover:text-[#006dfc] ${focusRing}`}
                    >
                        <StatContent stat={stat} />
                    </Link>
                ) : stat.onClick ? (
                    <button
                        type="button"
                        onClick={stat.onClick}
                        className={`flex min-h-11 items-center gap-1.5 rounded-sm px-1 text-left hover:text-[#006dfc] ${focusRing}`}
                    >
                        <StatContent stat={stat} />
                    </button>
                ) : (
                    <div className="flex min-h-11 items-center gap-1.5 px-1">
                        <StatContent stat={stat} />
                    </div>
                )}
            </div>
        ))}
        {children}
    </div>
)

const StatContent = ({ stat }: { stat: AdminStat }) => (
    <>
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[10px]">
            {stat.label}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
            {stat.value}
            {stat.suffix && (
                <span className="ml-0.5 text-[10px] font-normal text-slate-500">
                    {stat.suffix}
                </span>
            )}
        </span>
        {stat.delta && (
            <span
                className={`font-mono text-[10px] font-medium tabular-nums ${deltaTone(stat.delta.value)}`}
            >
                {deltaText(stat.delta)}
            </span>
        )}
    </>
)

export { focusRing }
export default AdminStatStrip
