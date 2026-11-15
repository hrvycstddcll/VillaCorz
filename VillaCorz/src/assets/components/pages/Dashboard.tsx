import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../../../services/dashboardService'
import type {
    DashboardSummary,
    DashboardTopService,
} from '../../../services/types'
import { money } from '../../../lib/format'
import AdminPageHeader from '../ui/AdminPageHeader'

const ranges = [7, 30, 90] as const
type Range = (typeof ranges)[number]

const Dashboard = () => {
    const [range, setRange] = useState<Range>(30)
    const [data, setData] = useState<DashboardSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [hovered, setHovered] = useState<number | null>(null)

    useEffect(() => {
        let active = true
        getDashboard(range)
            .then(({ data: envelope }) => {
                if (active) setData(envelope.data)
            })
            .catch(() => {
                if (active) setError('Unable to load dashboard data.')
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [range])

    const handleRangeChange = (next: Range) => {
        setLoading(true)
        setError('')
        setHovered(null)
        setRange(next)
    }

    const metrics = data?.metrics
    const comparison = data?.comparison
    const series = data?.series ?? []
    const recent = data?.recent_bookings ?? []
    const topServices = data?.top_services ?? []

    // Chart geometry
    const chartWidth = 760
    const chartHeight = 260
    const padding = { top: 20, right: 44, bottom: 34, left: 40 }
    const plotW = chartWidth - padding.left - padding.right
    const plotH = chartHeight - padding.top - padding.bottom
    const xStep = series.length > 1 ? plotW / (series.length - 1) : 0

    const maxBookings = Math.max(1, ...series.map((p) => p.bookings))
    const maxVisits = Math.max(1, ...series.map((p) => p.visits))

    const bookingsPoints = series.map((p, i) => ({
        x: padding.left + i * xStep,
        y: padding.top + plotH - (p.bookings / maxBookings) * plotH,
    }))
    const visitsPoints = series.map((p, i) => ({
        x: padding.left + i * xStep,
        y: padding.top + plotH - (p.visits / maxVisits) * plotH,
    }))

    const toPath = (pts: { x: number; y: number }[]) =>
        pts
            .map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
            .join(' ')

    const hoveredPoint = hovered !== null ? series[hovered] : null
    const hoveredX = hovered !== null ? padding.left + hovered * xStep : 0

    const tickIndices = series
        .map((_, i) => i)
        .filter((i) => {
            if (series.length <= 8) return true
            return i === 0 || i === series.length - 1 || i % Math.ceil(series.length / 6) === 0
        })

    const stats: { label: string; value: string; delta?: { delta: number; percent: number | null } }[] = [
        { label: 'Revenue', value: loading ? '—' : money(metrics?.revenue ?? 0), delta: comparison?.revenue },
        { label: 'Check-ins', value: loading ? '—' : (metrics?.check_ins ?? 0).toLocaleString(), delta: comparison?.check_ins },
        { label: 'New bookings', value: loading ? '—' : (metrics?.new_bookings ?? 0).toLocaleString(), delta: comparison?.new_bookings },
        { label: 'New users', value: loading ? '—' : (metrics?.new_users ?? 0).toLocaleString(), delta: comparison?.new_users },
        { label: 'Website visits', value: loading ? '—' : (metrics?.website_visits ?? 0).toLocaleString(), delta: comparison?.website_visits },
        { label: 'Paid payments', value: loading ? '—' : (metrics?.paid_count ?? 0).toLocaleString() },
    ]

    return (
        <div className="min-h-[calc(100dvh-var(--navbar-height,3.5rem))] bg-slate-50 pb-16">
            <AdminPageHeader
                eyebrow="Administration / Dashboard"
                title="Dashboard"
                subtitle="Bookings, guests and website traffic at a glance."
                rangeLabel={`${range} days`}
                rightSlot={
                    <div
                        role="group"
                        aria-label="Date range"
                        className="inline-flex self-start rounded-xl border border-white/20 bg-white/5 p-1"
                    >
                        {ranges.map((r) => (
                            <button
                                key={r}
                                type="button"
                                aria-pressed={range === r}
                                onClick={() => handleRangeChange(r)}
                                className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-[background-color,color] duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                                    range === r
                                        ? 'bg-white text-[#003079]'
                                        : 'text-blue-100 hover:bg-white/10'
                                }`}
                            >
                                {r} days
                            </button>
                        ))}
                    </div>
                }
                stats={stats.map((s) => ({
                    label: s.label,
                    value: s.value,
                    delta: s.delta,
                }))}
            />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 sm:px-6 lg:px-8">
                {error && (
                    <div
                        role="alert"
                        className="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <p className="leading-5">{error}</p>
                    </div>
                )}

                {/* Chart + top services */}
                <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#006dfc]">
                                        Analytics
                                    </p>
                                    <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#003079]">
                                        Booking & traffic trends
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Over the last {range} days.
                                    </p>
                                </div>
                                <ul className="flex items-center gap-4 text-xs text-slate-600">
                                    <li className="flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-[#006dfc]" aria-hidden="true" />
                                        Bookings
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-[#2bb8a8]" aria-hidden="true" />
                                        Website visits
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            {loading ? (
                                <div className="flex min-h-60 items-center justify-center">
                                    <p className="text-sm text-slate-500">Loading chart…</p>
                                </div>
                            ) : series.length === 0 ? (
                                <div className="flex min-h-60 items-center justify-center">
                                    <p className="text-sm text-slate-500">No data yet.</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <svg
                                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                        className="h-auto w-full"
                                        role="img"
                                        aria-label="Bookings and website visits over time"
                                        onMouseLeave={() => setHovered(null)}
                                    >
                                        {/* y-axis grid + labels */}
                                        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                                            const y = padding.top + plotH * (1 - t)
                                            return (
                                                <g key={t}>
                                                    <line
                                                        x1={padding.left}
                                                        x2={chartWidth - padding.right}
                                                        y1={y}
                                                        y2={y}
                                                        stroke="#e2e8f0"
                                                        strokeWidth="1"
                                                    />
                                                    <text
                                                        x={padding.left - 6}
                                                        y={y + 3}
                                                        textAnchor="end"
                                                        className="fill-slate-400 text-[9px] tabular-nums"
                                                    >
                                                        {Math.round(maxBookings * t)}
                                                    </text>
                                                </g>
                                            )
                                        })}

                                        {/* right axis (visits) labels */}
                                        {[0, 0.5, 1].map((t) => {
                                            const y = padding.top + plotH * (1 - t)
                                            return (
                                                <text
                                                    key={`v-${t}`}
                                                    x={chartWidth - padding.right + 6}
                                                    y={y + 3}
                                                    textAnchor="start"
                                                    className="fill-slate-400 text-[9px] tabular-nums"
                                                >
                                                    {Math.round(maxVisits * t)}
                                                </text>
                                            )
                                        })}

                                        {/* series lines */}
                                        <path
                                            d={toPath(visitsPoints)}
                                            fill="none"
                                            stroke="#2bb8a8"
                                            strokeWidth="2"
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d={toPath(bookingsPoints)}
                                            fill="none"
                                            stroke="#006dfc"
                                            strokeWidth="2"
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                        />

                                        {/* hover guide + dots */}
                                        {hovered !== null && (
                                            <g>
                                                <line
                                                    x1={hoveredX}
                                                    x2={hoveredX}
                                                    y1={padding.top}
                                                    y2={padding.top + plotH}
                                                    stroke="#94a3b8"
                                                    strokeWidth="1"
                                                    strokeDasharray="3 3"
                                                />
                                                <circle
                                                    cx={bookingsPoints[hovered].x}
                                                    cy={bookingsPoints[hovered].y}
                                                    r="4"
                                                    fill="#006dfc"
                                                    stroke="#fff"
                                                    strokeWidth="2"
                                                />
                                                <circle
                                                    cx={visitsPoints[hovered].x}
                                                    cy={visitsPoints[hovered].y}
                                                    r="4"
                                                    fill="#2bb8a8"
                                                    stroke="#fff"
                                                    strokeWidth="2"
                                                />
                                            </g>
                                        )}

                                        {/* invisible hover targets */}
                                        {series.map((_, i) => (
                                            <rect
                                                key={i}
                                                x={padding.left + i * xStep - xStep / 2}
                                                y={padding.top}
                                                width={xStep || plotW}
                                                height={plotH}
                                                fill="transparent"
                                                onMouseEnter={() => setHovered(i)}
                                            />
                                        ))}

                                        {/* x ticks */}
                                        {tickIndices.map((i) => (
                                            <text
                                                key={i}
                                                x={padding.left + i * xStep}
                                                y={chartHeight - 8}
                                                textAnchor="middle"
                                                className="fill-slate-400 text-[9px] tabular-nums"
                                            >
                                                {series[i].date.slice(5)}
                                            </text>
                                        ))}
                                    </svg>

                                    {hoveredPoint && (
                                        <div
                                            className="pointer-events-none absolute top-2 right-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur"
                                        >
                                            <p className="font-mono tabular-nums text-slate-500">
                                                {hoveredPoint.date}
                                            </p>
                                            <p className="mt-1 flex items-center gap-1.5 text-slate-700">
                                                <span className="size-2 rounded-full bg-[#006dfc]" />
                                                Bookings: <span className="font-mono tabular-nums font-medium">{hoveredPoint.bookings}</span>
                                            </p>
                                            <p className="flex items-center gap-1.5 text-slate-700">
                                                <span className="size-2 rounded-full bg-[#2bb8a8]" />
                                                Visits: <span className="font-mono tabular-nums font-medium">{hoveredPoint.visits}</span>
                                            </p>
                                            <p className="mt-1 text-slate-500">
                                                Revenue: <span className="font-mono tabular-nums">{money(hoveredPoint.revenue)}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top services */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#006dfc]">
                                Top services
                            </p>
                            <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#003079]">
                                By bookings
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Ranked by number of bookings.
                            </p>
                        </div>
                        <div className="px-4 py-4 sm:px-6">
                            {loading ? (
                                <div className="space-y-3">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div key={i} className="h-8 animate-pulse rounded bg-slate-100" />
                                    ))}
                                </div>
                            ) : topServices.length === 0 ? (
                                <p className="text-sm text-slate-500">No bookings yet.</p>
                            ) : (
                                <ol className="space-y-3">
                                    {topServices.map((s: DashboardTopService, i: number) => {
                                        const max = topServices[0]?.bookings || 1
                                        const pct = Math.round((s.bookings / max) * 100)
                                        return (
                                            <li key={s.service_id} className="flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="truncate text-sm font-medium text-slate-800">
                                                        {i + 1}. {s.name}
                                                    </span>
                                                    <span className="shrink-0 font-mono text-xs tabular-nums text-slate-500">
                                                        {s.bookings} · {money(s.revenue)}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full bg-[#006dfc]"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ol>
                            )}
                        </div>
                    </div>
                </section>

                {/* Recent bookings */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#006dfc]">
                                    Recent bookings
                                </p>
                                <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#003079]">
                                    Latest reservations
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {loading
                                        ? 'Loading…'
                                        : `${recent.length} most recent bookings.`}
                                </p>
                            </div>
                            <Link
                                to="/bookings"
                                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-[background-color,border-color,color] duration-150 hover:border-slate-300 hover:text-[#003079] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                            >
                                View all bookings
                            </Link>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                                    <th scope="col" className="px-4 py-3 font-medium sm:px-6">
                                        Guest
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Stay
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Status
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right font-medium sm:px-6">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [0, 1, 2, 3].map((row) => (
                                        <tr
                                            key={row}
                                            className="border-b border-slate-100 last:border-0"
                                        >
                                            <td className="px-4 py-4 sm:px-6">
                                                <span className="block h-2.5 w-28 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="block h-2.5 w-36 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="block h-5 w-20 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                                            </td>
                                            <td className="px-4 py-4 sm:px-6">
                                                <span className="ml-auto block h-2.5 w-16 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                                            </td>
                                        </tr>
                                    ))
                                ) : recent.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-6 py-16 text-center"
                                        >
                                            <p className="font-serif text-xl font-semibold text-[#003079]">
                                                No bookings yet
                                            </p>
                                            <p className="mx-auto mt-1 max-w-sm text-pretty text-sm leading-6 text-slate-500">
                                                New reservations will appear here as they are made.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    recent.map((b) => (
                                        <tr
                                            key={b.reference}
                                            className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50/70"
                                        >
                                            <td className="px-4 py-4 sm:px-6">
                                                <p className="text-[13px] font-medium text-slate-900">
                                                    {b.guest}
                                                </p>
                                                <p className="mt-0.5 font-mono text-[12px] tabular-nums text-slate-500">
                                                    {b.reference}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 text-[13px] text-slate-700">
                                                {b.stay.length ? b.stay.join(', ') : '—'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="inline-flex rounded-full bg-[#006dfc]/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0057c9]">
                                                    {b.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right font-mono text-[13px] tabular-nums text-slate-800 sm:px-6">
                                                {money(b.total)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    )
}

export default Dashboard
