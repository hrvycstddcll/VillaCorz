import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../../../services/dashboardService'
import type { DashboardSummary } from '../../../services/types'
import { money } from '../../../lib/format'

const ranges = [7, 30, 90] as const
type Range = (typeof ranges)[number]


const Dashboard = () => {
    const [range, setRange] = useState<Range>(30)
    const [data, setData] = useState<DashboardSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

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
        setRange(next)
    }

    const metrics = data?.metrics
    const series = data?.series ?? []
    const recent = data?.recent_bookings ?? []

    const maxVisits = Math.max(1, ...series.map((p) => p.visits))
    const maxBookings = Math.max(1, ...series.map((p) => p.bookings))
    const chartWidth = 720
    const chartHeight = 220
    const padding = { top: 16, right: 16, bottom: 28, left: 36 }
    const plotW = chartWidth - padding.left - padding.right
    const plotH = chartHeight - padding.top - padding.bottom
    const xStep = series.length > 1 ? plotW / (series.length - 1) : 0

    const bookingsPath = series
        .map((p, i) => {
            const x = padding.left + i * xStep
            const y = padding.top + plotH - (p.bookings / maxBookings) * plotH
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')
    const visitsPath = series
        .map((p, i) => {
            const x = padding.left + i * xStep
            const y = padding.top + plotH - (p.visits / maxVisits) * plotH
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')

    const tickLabels = series.filter((_, i) => {
        if (series.length <= 8) return true
        return i === 0 || i === series.length - 1 || i % Math.ceil(series.length / 6) === 0
    })

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-6 pt-6 sm:px-6 lg:px-8">
            <main className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#003079]">
                            Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Bookings, guests and website traffic at a glance.
                        </p>
                    </div>
                    <div
                        role="group"
                        aria-label="Date range"
                        className="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1"
                    >
                        {ranges.map((r) => (
                            <button
                                key={r}
                                type="button"
                                aria-pressed={range === r}
                                onClick={() => handleRangeChange(r)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] ${
                                    range === r
                                        ? 'bg-[#006dfc] text-white'
                                        : 'text-slate-600 hover:bg-white/70'
                                }`}
                            >
                                {r} days
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                    >
                        {error}
                    </div>
                )}

                <section aria-label="Analytics overview" className="grid gap-4 lg:grid-cols-12">
                    <article className="flex min-h-40 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-4">
                        <div>
                            <h2 className="text-sm font-medium text-slate-600">Revenue</h2>
                            <p className="mt-2 font-serif text-4xl font-bold tracking-tight text-[#003079]">
                                {loading ? '—' : money(metrics?.revenue ?? 0)}
                            </p>
                        </div>
                        <p className="mt-4 border-t border-slate-300/40 pt-3 text-xs text-slate-500">
                            {loading
                                ? 'Loading…'
                                : `${metrics?.paid_count ?? 0} paid payments in the last ${range} days.`}
                        </p>
                    </article>

                    <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
                        {[
                            { label: 'Check-ins', value: metrics?.check_ins ?? 0 },
                            { label: 'New bookings', value: metrics?.new_bookings ?? 0 },
                            { label: 'New users', value: metrics?.new_users ?? 0 },
                            { label: 'Website visits', value: metrics?.website_visits ?? 0 },
                        ].map((metric) => (
                            <article
                                key={metric.label}
                                className="flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
                            >
                                <h2 className="text-sm font-medium text-slate-600">
                                    {metric.label}
                                </h2>
                                <p className="font-serif text-3xl font-bold tracking-tight text-[#003079]">
                                    {loading ? '—' : metric.value.toLocaleString()}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <section
                    aria-labelledby="analytics-chart-heading"
                    className="flex min-h-[22rem] flex-col rounded-2xl border border-slate-200 bg-white p-6"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2
                                id="analytics-chart-heading"
                                className="font-serif text-lg font-bold text-[#003079]"
                            >
                                Analytics
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Booking and traffic trends over the last {range} days.
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

                    <div className="mt-4 flex min-h-60 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                        {loading ? (
                            <p className="text-sm text-slate-500">Loading chart…</p>
                        ) : series.length === 0 ? (
                            <p className="text-sm text-slate-500">No data yet.</p>
                        ) : (
                            <svg
                                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                className="h-full w-full"
                                role="img"
                                aria-label="Bookings and website visits over time"
                            >
                                {/* y-axis grid */}
                                {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                                    <line
                                        key={t}
                                        x1={padding.left}
                                        x2={chartWidth - padding.right}
                                        y1={padding.top + plotH * (1 - t)}
                                        y2={padding.top + plotH * (1 - t)}
                                        stroke="#e2e8f0"
                                        strokeWidth="1"
                                    />
                                ))}
                                <path
                                    d={visitsPath}
                                    fill="none"
                                    stroke="#2bb8a8"
                                    strokeWidth="2"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                />
                                <path
                                    d={bookingsPath}
                                    fill="none"
                                    stroke="#006dfc"
                                    strokeWidth="2"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                />
                                {tickLabels.map((p) => {
                                    const i = series.indexOf(p)
                                    const x = padding.left + i * xStep
                                    return (
                                        <text
                                            key={p.date}
                                            x={x}
                                            y={chartHeight - 6}
                                            textAnchor="middle"
                                            className="fill-slate-400 text-[10px]"
                                        >
                                            {p.date.slice(5)}
                                        </text>
                                    )
                                })}
                            </svg>
                        )}
                    </div>
                </section>

                <section aria-labelledby="bookings-heading" className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2
                                id="bookings-heading"
                                className="font-serif text-lg font-bold text-[#003079]"
                            >
                                Recent bookings
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                {loading
                                    ? 'Loading…'
                                    : `${recent.length} most recent bookings.`}
                            </p>
                        </div>
                        <Link
                            to="/bookings"
                            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                            View all bookings
                        </Link>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full min-w-[34rem] text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-300/40 text-xs text-slate-500">
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Guest
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Stay
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Status
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [0, 1, 2, 3].map((row) => (
                                        <tr
                                            key={row}
                                            className="border-b border-slate-300/30 last:border-0"
                                        >
                                            <td className="px-4 py-3.5">
                                                <span className="block h-2.5 w-28 animate-pulse rounded-full bg-slate-200" />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="block h-2.5 w-36 animate-pulse rounded-full bg-slate-200" />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="block h-5 w-20 animate-pulse rounded-full bg-slate-200" />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="block h-2.5 w-16 animate-pulse rounded-full bg-slate-200" />
                                            </td>
                                        </tr>
                                    ))
                                ) : recent.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-4 py-8 text-center text-sm text-slate-500"
                                        >
                                            No bookings yet.
                                        </td>
                                    </tr>
                                ) : (
                                    recent.map((b) => (
                                        <tr
                                            key={b.reference}
                                            className="border-b border-slate-300/30 last:border-0"
                                        >
                                            <td className="px-4 py-3.5">
                                                <p className="font-medium text-slate-800">
                                                    {b.guest}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {b.reference}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-600">
                                                {b.stay.length
                                                    ? b.stay.join(', ')
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex rounded-full bg-[#006dfc]/10 px-2.5 py-0.5 text-xs font-medium text-[#0057c9]">
                                                    {b.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 font-medium text-slate-800">
                                                {money(b.total)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    )
}

export default Dashboard
