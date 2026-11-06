import { useState } from 'react'

const metrics = [
    { label: 'Check-ins', value: '—' },
    { label: 'New bookings', value: '—' },
    { label: 'New users', value: '—' },
    { label: 'Website visits', value: '—' },
]

const ranges = ['7 days', '30 days', '90 days'] as const
const tableColumns = ['Guest', 'Stay', 'Status', 'Amount']

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const Dashboard = () => {
    const [range, setRange] = useState<(typeof ranges)[number]>('30 days')

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-6 pt-6 sm:px-6 lg:px-8">
                    <main className="flex flex-col gap-6">
                        {/* Page heading */}
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
                                        onClick={() => setRange(r)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${focusRing} ${
                                            range === r
                                                ? 'bg-[#006dfc] text-white'
                                                : 'text-slate-600 hover:bg-white/70'
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Metrics */}
                        <section aria-label="Analytics overview" className="grid gap-4 lg:grid-cols-12">
                            <article className="flex min-h-40 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-4">
                                <div>
                                    <h2 className="text-sm font-medium text-slate-600">Revenue</h2>
                                    <p className="mt-2 font-serif text-4xl font-bold tracking-tight text-[#003079]">
                                        ₱ —
                                    </p>
                                </div>
                                <p className="mt-4 border-t border-slate-300/40 pt-3 text-xs text-slate-500">
                                    Revenue summary will appear here when connected.
                                </p>
                            </article>

                            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
                                {metrics.map((metric) => (
                                    <article
                                        key={metric.label}
                                        className="flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
                                    >
                                        <h2 className="text-sm font-medium text-slate-600">{metric.label}</h2>
                                        <p className="font-serif text-3xl font-bold tracking-tight text-[#003079]">
                                            {metric.value}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </section>

                        {/* Analytics chart */}
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
                                        Booking and traffic trends over the last {range}.
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

                            <div className="mt-4 flex min-h-60 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm text-slate-500">
                                    Chart will appear when analytics data is connected.
                                </p>
                            </div>
                        </section>

                        {/* Management table */}
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
                                        Bookings will appear here when connected.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    disabled
                                    title="Coming soon"
                                    className="cursor-not-allowed rounded-xl border border-white/70 bg-white/40 px-3.5 py-2 text-xs font-medium text-slate-400"
                                >
                                    View all bookings
                                </button>
                            </div>

                            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="w-full min-w-[34rem] text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-300/40 text-xs text-slate-500">
                                            {tableColumns.map((col) => (
                                                <th key={col} scope="col" className="px-4 py-3 font-medium">
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[0, 1, 2, 3].map((row) => (
                                            <tr
                                                key={row}
                                                className="border-b border-slate-300/30 last:border-0"
                                            >
                                                <td className="px-4 py-3.5">
                                                    <span className="block h-2.5 w-28 rounded-full bg-slate-300/40" />
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="block h-2.5 w-36 rounded-full bg-slate-300/40" />
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="block h-5 w-20 rounded-full bg-[#006dfc]/10" />
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="block h-2.5 w-16 rounded-full bg-slate-300/40" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </main>
        </div>
    )
}

export default Dashboard
