import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from 'lucide-react'
import { WarmTooltip } from '../ui/WarmTooltip'

export type AdminStat = {
    label: string
    value: string
    delta?: { value: number; percent: number | null }
    deltaDirection?: 'higher' | 'lower'
    suffix?: string
    href?: string
    onClick?: () => void
    tooltip?: string
}

type AdminStatStripProps = {
    stats: AdminStat[]
    className?: string
    children?: ReactNode
}

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const deltaTone = (val: number, direction: 'higher' | 'lower' = 'higher') => {
    const improvement = direction === 'higher' ? val : -val
    return improvement > 0
        ? 'text-emerald-700'
        : improvement < 0
          ? 'text-rose-700'
          : 'text-slate-500'
}

const deltaText = (d: { value: number; percent: number | null }) => {
    if (d.percent !== null) {
        const sign = d.percent > 0 ? '+' : ''
        return `${sign}${d.percent}%`
    }
    const sign = d.value >= 0 ? '+' : ''
    return `${sign}${d.value}`
}

const DeltaIcon = ({ value }: { value: number }) => {
    if (value > 0) return <ArrowUpRight className="size-3" aria-hidden="true" />
    if (value < 0) return <ArrowDownRight className="size-3" aria-hidden="true" />
    return <Minus className="size-3" aria-hidden="true" />
}

const withTooltip = (content: ReactNode, tooltip?: string) =>
    tooltip ? (
        <WarmTooltip content={tooltip} size="sm">
            {content}
        </WarmTooltip>
    ) : (
        content
    )

const AdminStatStrip = ({ stats, className = '', children }: AdminStatStripProps) => (
    <div
        role="group"
        aria-label="Key metrics"
        className={`flex flex-wrap items-stretch gap-x-4 gap-y-1 ${className}`}
    >
        {stats.map((stat) => {
            const interactive = Boolean(stat.href || stat.onClick)
            const item = (
                <div className="flex">
                    {stat.href ? (
                        <Link
                            to={stat.href}
                            className={`group flex min-h-11 items-center gap-1.5 rounded-sm px-1 text-left transition-colors hover:text-[#006dfc] ${focusRing}`}
                        >
                            <StatContent stat={stat} interactive={interactive} />
                        </Link>
                    ) : stat.onClick ? (
                        <button
                            type="button"
                            onClick={stat.onClick}
                            className={`group flex min-h-11 items-center gap-1.5 rounded-sm px-1 text-left transition-colors hover:text-[#006dfc] ${focusRing}`}
                        >
                            <StatContent stat={stat} interactive={interactive} />
                        </button>
                    ) : (
                        <div className="flex min-h-11 items-center gap-1.5 px-1">
                            <StatContent stat={stat} />
                        </div>
                    )}
                </div>
            )
            return (
                <div key={stat.label} className="contents">
                    {withTooltip(item, stat.tooltip)}
                </div>
            )
        })}
        {children}
    </div>
)

const StatContent = ({
    stat,
    interactive = false,
}: {
    stat: AdminStat
    interactive?: boolean
}) => (
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
                className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-medium tabular-nums ${deltaTone(stat.delta.value, stat.deltaDirection)}`}
            >
                <DeltaIcon value={stat.delta.value} />
                {deltaText(stat.delta)}
            </span>
        )}
        {interactive && (
            <ChevronRight
                className="size-3.5 text-slate-400"
                aria-hidden="true"
            />
        )}
    </>
)

export { focusRing }
export default AdminStatStrip
