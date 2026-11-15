import type { ReactNode } from 'react'

type Stat = {
    label: string
    value: string
    delta?: { delta: number; percent: number | null } | null
    deltaLabel?: string
}

type AdminPageHeaderProps = {
    eyebrow: string
    title: string
    subtitle?: string
    rightSlot?: ReactNode
    stats?: Stat[]
    rangeLabel?: string
}

const deltaTone = (delta: { delta: number } | null | undefined) => {
    if (!delta || delta.delta === 0) return 'text-blue-200'
    return delta.delta > 0 ? 'text-emerald-300' : 'text-rose-300'
}

const deltaText = (delta: { delta: number; percent: number | null } | null | undefined) => {
    if (!delta) return null
    if (delta.percent === null) {
        return `${delta.delta >= 0 ? '+' : ''}${delta.delta}`
    }
    const sign = delta.percent > 0 ? '+' : ''
    return `${sign}${delta.percent}%`
}

const AdminPageHeader = ({
    eyebrow,
    title,
    subtitle,
    rightSlot,
    stats,
    rangeLabel,
}: AdminPageHeaderProps) => (
    <header className="relative w-full bg-[#003079] text-white">
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-full h-[var(--navbar-height,3.5rem)] bg-[#003079]"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-10 font-poppins sm:px-6 sm:pb-10 sm:pt-12 lg:px-8">
            <div className="relative max-w-2xl pb-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-200">
                    {eyebrow}
                </p>
                <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {title}
                </h1>
                {subtitle && (
                    <p className="max-w-xl pt-3 text-sm leading-6 text-blue-100">
                        {subtitle}
                    </p>
                )}
            </div>

            {rightSlot && (
                <div className="relative -mt-6 mb-6 flex flex-wrap items-center justify-end gap-2">
                    {rightSlot}
                </div>
            )}

            {stats && stats.length > 0 && (
                <dl
                    aria-label="Summary"
                    className="relative grid grid-cols-2 gap-y-5 border-t border-white/20 pt-6 sm:grid-cols-3 sm:gap-y-0 sm:divide-x sm:divide-white/20 lg:grid-cols-6"
                >
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="px-3 first:pl-0 last:pr-0 sm:px-4"
                        >
                            <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-100 sm:text-[10px]">
                                {stat.label}
                            </dt>
                            <dd className="pt-1 font-mono text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">
                                {stat.value}
                            </dd>
                            {stat.delta && (
                                <dd
                                    className={`pt-1 text-[11px] font-medium tabular-nums ${deltaTone(stat.delta)}`}
                                >
                                    {stat.deltaLabel ?? deltaText(stat.delta)}{' '}
                                    {rangeLabel ? `vs prior ${rangeLabel}` : ''}
                                </dd>
                            )}
                        </div>
                    ))}
                </dl>
            )}
        </div>
    </header>
)

export default AdminPageHeader
export type { Stat as AdminPageHeaderStat }