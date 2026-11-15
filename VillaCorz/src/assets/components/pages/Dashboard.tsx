import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
    CalendarClock,
    CircleAlert,
    CreditCard,
    MessageSquareText,
    Star,
} from 'lucide-react'
import { money } from '../../../lib/format'
import { getDashboard } from '../../../services/dashboardService'
import type {
    AdminReportKind,
    DashboardRecentBooking,
    DashboardSummary,
} from '../../../services/types'
import AdminCard from '../admin/AdminCard'
import AdminEmptyState from '../admin/AdminEmptyState'
import AdminStatStrip from '../admin/AdminStatStrip'
import AdminTable, { type AdminTableColumn } from '../admin/AdminTable'
import AdminFilterPills from '../admin/AdminFilterPills'
import AdminPageHeader from '../ui/AdminPageHeader'

const ranges = [7, 30, 90] as const
type Range = (typeof ranges)[number]

const numberFormatter = new Intl.NumberFormat('en-PH')
const emptySeries: DashboardSummary['series'] = []
const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const parseRange = (value: string | null): Range =>
    ranges.includes(Number(value) as Range) ? (Number(value) as Range) : 30

const statusTone = (status: string) => {
    if (status === 'confirmed' || status === 'completed' || status === 'paid') {
        return 'bg-emerald-500'
    }
    if (status === 'expired' || status === 'cancelled') return 'bg-rose-500'
    return 'bg-amber-500'
}

const Dashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const range = parseRange(searchParams.get('range'))
    const [result, setResult] = useState<{
        range: Range
        data: DashboardSummary
    } | null>(null)
    const [failure, setFailure] = useState<{ range: Range; message: string } | null>(null)

    useEffect(() => {
        let active = true
        getDashboard(range)
            .then(({ data: envelope }) => {
                if (active) {
                    setResult({ range, data: envelope.data })
                    setFailure(null)
                }
            })
            .catch(() => {
                if (active) {
                    setFailure({
                        range,
                        message: 'Unable to load dashboard data.',
                    })
                }
            })

        return () => {
            active = false
        }
    }, [range])

    const data = result?.range === range ? result.data : null
    const loading = data === null && failure?.range !== range
    const error = failure?.range === range ? failure.message : ''
    const series = data?.series ?? emptySeries
    const bookings = data?.recent_bookings ?? []
    const reportHref = (
        report: AdminReportKind,
        filters: { status?: string; date_field?: string } = {},
    ) => {
        const params = new URLSearchParams({ report })
        if (data?.start) params.set('from', data.start)
        if (data?.end) params.set('to', data.end)
        if (filters.status) params.set('status', filters.status)
        if (filters.date_field) params.set('date_field', filters.date_field)
        return `/reports?${params.toString()}`
    }
    const revenuePoints = useMemo(() => {
        const chartWidth = 720
        const chartHeight = 220
        const pad = { top: 16, right: 12, bottom: 28, left: 48 }
        const maxValue = Math.max(1, ...series.map((point) => point.revenue))
        const plotWidth = chartWidth - pad.left - pad.right
        const plotHeight = chartHeight - pad.top - pad.bottom
        const step = series.length > 1 ? plotWidth / (series.length - 1) : 0
        const points = series.map((point, index) => ({
            ...point,
            x: pad.left + index * step,
            y: pad.top + plotHeight - (point.revenue / maxValue) * plotHeight,
        }))

        return {
            points,
            path: points
                .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
                .join(' '),
            width: chartWidth,
            height: chartHeight,
            padding: pad,
            plotHeight,
            maxValue,
        }
    }, [series])

    const bookingColumns: AdminTableColumn<DashboardRecentBooking>[] = [
        {
            key: 'guest',
            label: 'Guest',
            render: (booking) => (
                <Link
                    to={`/reports?report=bookings&search=${encodeURIComponent(booking.reference)}`}
                    className={`block min-h-11 rounded-sm py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]`}
                >
                    <span className="block font-medium text-slate-900">
                        {booking.guest}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-slate-500">
                        {booking.reference}
                    </span>
                </Link>
            ),
        },
        {
            key: 'stay',
            label: 'Stay',
            className: 'hidden md:table-cell',
            render: (booking) => (
                <span className="text-xs text-slate-600">
                    {booking.stay.length ? booking.stay.join(', ') : '—'}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (booking) => (
                <span className="inline-flex min-h-11 items-center gap-2 text-xs capitalize text-slate-700">
                    <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${statusTone(booking.status)}`}
                    />
                    {booking.status.replaceAll('_', ' ')}
                </span>
            ),
        },
        {
            key: 'total',
            label: 'Total',
            align: 'right',
            render: (booking) => (
                <span className="font-mono text-xs tabular-nums text-slate-800">
                    {money(booking.total)}
                </span>
            ),
        },
    ]

    const setRange = (next: Range) => {
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('range', String(next))
        setSearchParams(nextParams, { replace: true })
    }

    const metrics = data?.metrics
    const comparison = data?.comparison
    const actionCenter = data?.action_center
    const kpis = [
        {
            label: 'Check-ins',
            value: data ? numberFormatter.format(metrics?.check_ins ?? 0) : '—',
            delta: data ? comparison?.check_ins : undefined,
            href: data
                ? reportHref('bookings', {
                      status: 'check_ins',
                      date_field: 'check_in',
                  })
                : undefined,
        },
        {
            label: 'New bookings',
            value: data ? numberFormatter.format(metrics?.new_bookings ?? 0) : '—',
            delta: data ? comparison?.new_bookings : undefined,
            href: data ? reportHref('bookings') : undefined,
        },
        {
            label: 'New guests',
            value: data ? numberFormatter.format(metrics?.new_users ?? 0) : '—',
            delta: data ? comparison?.new_users : undefined,
            href: data ? reportHref('guests') : undefined,
        },
        {
            label: 'Site visits',
            value: data ? numberFormatter.format(metrics?.website_visits ?? 0) : '—',
            delta: data ? comparison?.website_visits : undefined,
            href: data ? reportHref('traffic') : undefined,
        },
    ]
    const actionItems = [
        {
            label: 'Pending cancellations',
            count: actionCenter?.pending_cancellations ?? 0,
            icon: CalendarClock,
            href: '/reports?report=cancellations&status=pending',
            tone: 'amber',
        },
        {
            label: 'Unpublished reviews',
            count: actionCenter?.unpublished_reviews ?? 0,
            icon: Star,
            href: '/reports?report=reviews&status=pending',
            tone: 'amber',
        },
        {
            label: 'Contact messages',
            count: actionCenter?.contact_messages ?? 0,
            icon: MessageSquareText,
            href: '/reports?report=contacts&status=unread',
            tone: 'blue',
        },
        {
            label: 'Expired payments',
            count: actionCenter?.expired_payments ?? 0,
            icon: CreditCard,
            href: '/reports?report=payments&status=expired',
            tone: 'rose',
        },
    ]

    return (
        <main className="min-h-screen bg-white pb-12 text-slate-900">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <AdminPageHeader
                    eyebrow="Administration / Overview"
                    title="Dashboard"
                    subtitle="A working view of stays, guest activity, and cash flow."
                    hero={{
                        label: 'Revenue',
                        value: data ? money(metrics?.revenue ?? 0) : '—',
                        delta: data ? comparison?.revenue : undefined,
                        href: data ? reportHref('revenue') : undefined,
                    }}
                    action={
                        <AdminFilterPills
                            label="Dashboard date range"
                            value={range}
                            onChange={setRange}
                            options={ranges.map((value) => ({
                                value,
                                label: `${value} days`,
                            }))}
                        />
                    }
                />

                <AdminStatStrip
                    stats={kpis.map((stat) => ({
                        label: stat.label,
                        value: stat.value,
                        delta: stat.delta
                            ? {
                                  value: stat.delta.delta,
                                  percent: stat.delta.percent,
                              }
                            : undefined,
                        href: stat.href,
                    }))}
                    className="border-b border-[rgba(0,0,0,0.06)] pb-2"
                />

                {error && (
                    <div
                        role="alert"
                        className="flex items-center gap-2 text-sm text-rose-700"
                    >
                        <CircleAlert className="size-4" aria-hidden="true" />
                        {error}
                    </div>
                )}

                <section className="grid gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(16rem,1fr)]">
                    <AdminCard className="min-w-0" padding={false}>
                        <div className="flex items-start justify-between gap-4 px-5 pt-5">
                            <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Cash flow
                                </p>
                                <h2 className="mt-1 font-serif text-xl font-bold tracking-tight">
                                    Revenue by day
                                </h2>
                            </div>
                            <span className="inline-flex min-h-11 items-center gap-2 text-xs text-slate-600">
                                <span
                                    aria-hidden="true"
                                    className="size-1.5 rounded-full bg-[#006dfc]"
                                />
                                Revenue
                            </span>
                        </div>
                        <div className="px-3 pb-4 pt-3 sm:px-5">
                            {loading ? (
                                <p role="status" className="py-16 text-center text-sm text-slate-500">
                                    Loading revenue…
                                </p>
                            ) : error ? (
                                <p className="py-16 text-center text-sm text-slate-500">
                                    Revenue trend unavailable.
                                </p>
                            ) : series.length === 0 ? (
                                <AdminEmptyState
                                    icon={CreditCard}
                                    heading="No revenue yet"
                                    subtitle="Paid bookings will appear here as payments are recorded."
                                    ctaLabel="Open revenue report"
                                    href="/reports?report=revenue"
                                />
                            ) : (
                                <div className="overflow-hidden">
                                    <svg
                                        viewBox={`0 0 ${revenuePoints.width} ${revenuePoints.height}`}
                                        role="img"
                                        aria-label={`Revenue over the last ${range} days`}
                                        className="h-auto w-full"
                                    >
                                        {[0, 0.5, 1].map((tick) => {
                                            const y =
                                                revenuePoints.padding.top +
                                                revenuePoints.plotHeight * (1 - tick)
                                            return (
                                                <g key={tick}>
                                                    <line
                                                        x1={revenuePoints.padding.left}
                                                        x2={revenuePoints.width - 12}
                                                        y1={y}
                                                        y2={y}
                                                        stroke="rgba(0,0,0,0.06)"
                                                    />
                                                    <text
                                                        x={revenuePoints.padding.left - 8}
                                                        y={y + 3}
                                                        textAnchor="end"
                                                        className="fill-slate-500 font-mono text-[9px] tabular-nums"
                                                    >
                                                        {money(revenuePoints.maxValue * tick)}
                                                    </text>
                                                </g>
                                            )
                                        })}
                                        <path
                                            d={revenuePoints.path}
                                            fill="none"
                                            stroke="#006dfc"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        {revenuePoints.points.map((point, index) => (
                                            <g key={point.date}>
                                                {(index === 0 ||
                                                    index ===
                                                        revenuePoints.points.length - 1 ||
                                                    index % Math.ceil(range / 6) === 0) && (
                                                    <text
                                                        x={point.x}
                                                        y={revenuePoints.height - 6}
                                                        textAnchor="middle"
                                                        className="fill-slate-500 font-mono text-[9px] tabular-nums"
                                                    >
                                                        {point.date.slice(5)}
                                                    </text>
                                                )}
                                                <circle
                                                    cx={point.x}
                                                    cy={point.y}
                                                    r="4"
                                                    fill="#006dfc"
                                                >
                                                    <title>
                                                        {point.date}: {money(point.revenue)}
                                                    </title>
                                                </circle>
                                            </g>
                                        ))}
                                    </svg>
                                </div>
                            )}
                        </div>
                    </AdminCard>

                    <AdminCard>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Needs attention
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-tight">
                            Action center
                        </h2>
                        <ul className="mt-3 divide-y divide-[rgba(0,0,0,0.06)]">
                            {!data ? (
                                <li className="py-4 text-sm text-slate-500" role={loading ? 'status' : undefined}>
                                    {loading ? 'Loading action items…' : 'Action items unavailable.'}
                                </li>
                            ) : actionItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <li key={item.label}>
                                        <Link
                                            to={item.href}
                                            className={`flex min-h-12 items-center gap-3 rounded-sm py-2 ${focusRing}`}
                                        >
                                            <Icon
                                                className="size-4 shrink-0 text-slate-500"
                                                aria-hidden="true"
                                            />
                                            <span className="flex-1 text-xs text-slate-700">
                                                {item.label}
                                            </span>
                                            <span
                                                className={`font-mono text-sm font-semibold tabular-nums ${
                                                    item.count > 0
                                                        ? item.tone === 'rose'
                                                            ? 'text-rose-700'
                                                            : item.tone === 'amber'
                                                              ? 'text-amber-700'
                                                              : 'text-[#006dfc]'
                                                        : 'text-slate-500'
                                                }`}
                                            >
                                                {numberFormatter.format(item.count)}
                                            </span>
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </AdminCard>
                </section>

                <section className="grid gap-8 lg:grid-cols-2">
                    <AdminCard>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Revenue mix
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-tight">
                            By service
                        </h2>
                        {loading ? (
                            <p role="status" className="mt-4 py-4 text-sm text-slate-500">
                                Loading service revenue…
                            </p>
                        ) : error ? (
                            <p className="mt-4 py-4 text-sm text-slate-500">
                                Service revenue unavailable.
                            </p>
                        ) : data?.top_services.length ? (
                            <ol className="mt-4 divide-y divide-[rgba(0,0,0,0.06)]">
                                {data.top_services.map((service) => (
                                <li key={service.service_id}>
                                    <Link
                                        to={`/manageOffers?search=${encodeURIComponent(service.name)}`}
                                        className={`flex min-h-12 items-center gap-3 py-2 ${focusRing}`}
                                    >
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                            {service.name}
                                        </span>
                                        <span className="font-mono text-xs tabular-nums text-slate-500">
                                            {service.bookings} bookings
                                        </span>
                                        <span className="font-mono text-xs tabular-nums">
                                            {money(service.revenue)}
                                        </span>
                                    </Link>
                                </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="mt-4 py-4 text-sm text-slate-500">
                                No service revenue in this period.
                            </p>
                        )}
                    </AdminCard>

                    <AdminCard>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Stay performance
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-tight">
                            Occupancy and yield
                        </h2>
                        <AdminStatStrip
                            className="mt-3 gap-x-5"
                            stats={[
                                {
                                    label: 'Occupancy',
                                    value: data ? `${data.operational.occupancy}%` : '—',
                                },
                                {
                                    label: 'ADR',
                                    value: data ? money(data.operational.adr) : '—',
                                },
                                {
                                    label: 'RevPAR',
                                    value: data ? money(data.operational.revpar) : '—',
                                },
                            ]}
                        />
                        <div className="mt-3 border-t border-[rgba(0,0,0,0.06)] pt-3">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Booked next 30 days
                            </p>
                            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
                                {data ? money(data.operational.booked_forward_revenue) : '—'}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                Confirmed reservations already on the books; not a predictive estimate.
                            </p>
                        </div>
                    </AdminCard>
                </section>

                <section className="grid gap-8 lg:grid-cols-2">
                    <AdminCard>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Weekly pattern
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-tight">
                            Revenue by day of week
                        </h2>
                        <div className="mt-4 space-y-3">
                            {loading && (
                                <p role="status" className="py-4 text-sm text-slate-500">
                                    Loading weekday breakdown…
                                </p>
                            )}
                            {!loading && error && (
                                <p className="py-4 text-sm text-slate-500">
                                    Weekday breakdown unavailable.
                                </p>
                            )}
                            {!loading && !error && (data?.revenue_by_weekday ?? []).map((amount, index) => {
                                const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                                const max = Math.max(1, ...(data?.revenue_by_weekday ?? []))
                                return (
                                    <div key={labels[index]} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3">
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                            {labels[index]}
                                        </span>
                                        <div
                                            className="h-1 overflow-hidden rounded-full bg-slate-100"
                                            role="img"
                                            aria-label={`${labels[index]} revenue ${money(amount)}`}
                                        >
                                            <div
                                                className="h-full rounded-full bg-[#006dfc]"
                                                style={{ width: `${(amount / max) * 100}%` }}
                                            />
                                        </div>
                                        <span className="font-mono text-xs tabular-nums">
                                            {money(amount)}
                                        </span>
                                    </div>
                                )
                            })}
                            {!loading && !error && data?.revenue_by_weekday.length === 0 && (
                                <p className="py-4 text-sm text-slate-500">No weekday breakdown available.</p>
                            )}
                        </div>
                    </AdminCard>

                    <AdminCard padding={false}>
                        <div className="px-5 pt-5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Reservations
                            </p>
                            <h2 className="mt-1 font-serif text-xl font-bold tracking-tight">
                                Recent bookings
                            </h2>
                            <Link
                                to="/reports?report=bookings"
                                className={`mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-[#006dfc] ${focusRing}`}
                            >
                                View bookings report
                            </Link>
                        </div>
                        <div className="px-5 pb-4 pt-2">
                            {loading ? (
                                <p role="status" className="py-6 text-sm text-slate-500">Loading bookings…</p>
                            ) : error ? (
                                <p className="py-6 text-sm text-slate-500">
                                    Recent bookings unavailable.
                                </p>
                            ) : bookings.length === 0 ? (
                                <AdminEmptyState
                                    icon={CalendarClock}
                                    heading="No bookings yet"
                                    subtitle="New reservations will appear here as guests book."
                                    ctaLabel="Open bookings report"
                                    href="/reports?report=bookings"
                                />
                            ) : (
                                <>
                                    <div className="hidden sm:block">
                                        <AdminTable
                                            label="Recent bookings"
                                            columns={bookingColumns}
                                            rows={bookings}
                                            rowKey={(booking) => booking.reference}
                                        />
                                    </div>
                                    <ul className="divide-y divide-[rgba(0,0,0,0.06)] sm:hidden">
                                        {bookings.map((booking) => (
                                            <li key={booking.reference} className="py-2">
                                                <Link
                                                    to={`/reports?report=bookings&search=${encodeURIComponent(booking.reference)}`}
                                                    className={`flex min-h-11 items-center gap-3 rounded-sm ${focusRing}`}
                                                >
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-medium">{booking.guest}</span>
                                                        <span className="font-mono text-[10px] tabular-nums text-slate-500">{booking.reference}</span>
                                                    </span>
                                                    <span className="font-mono text-xs tabular-nums">{money(booking.total)}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </AdminCard>
                </section>
            </div>
        </main>
    )
}

export default Dashboard
