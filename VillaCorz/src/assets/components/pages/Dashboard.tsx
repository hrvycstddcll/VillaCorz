import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
    CalendarClock,
    CircleAlert,
    CreditCard,
    Info,
    MessageSquareText,
    RefreshCw,
    Star,
} from 'lucide-react'
import { money } from '../../../lib/format'
import { getApiErrorMessage } from '../../../lib/apiError'
import {
    getDashboard,
    type DashboardForecastOptions,
} from '../../../services/dashboardService'
import type {
    AdminReportKind,
    DashboardRecentBooking,
    DashboardSummary,
} from '../../../services/types'
import DashboardLineChart from '../admin/DashboardLineChart'
import type {
    DashboardChartPoint,
    DashboardChartSeries,
} from '../admin/DashboardLineChart'
import AdminCard from '../admin/AdminCard'
import AdminEmptyState from '../admin/AdminEmptyState'
import AdminStatStrip from '../admin/AdminStatStrip'
import AdminTable, { type AdminTableColumn } from '../admin/AdminTable'
import AdminFilterPills from '../admin/AdminFilterPills'
import AdminPageHeader from '../ui/InteractiveComponents/AdminPageHeader'
import { WarmTooltip } from '../ui/WarmTooltip'

const ranges = [7, 30, 90] as const
type Range = (typeof ranges)[number]
const forecastPresets = ['14', '30', '60'] as const
const backtestRanges = [7, 14, 30] as const
type AnalysisView = 'accuracy' | 'forecast'

const numberFormatter = new Intl.NumberFormat('en-PH')
const revenueChartSeries: DashboardChartSeries[] = [
    { key: 'revenue', label: 'Revenue', color: '#006dfc' },
]
const accuracyChartSeries: DashboardChartSeries[] = [
    { key: 'actual', label: 'Actual paid days', color: '#64748b' },
    {
        key: 'predicted',
        label: 'Predicted paid days',
        color: '#006dfc',
        strokeDasharray: '6 4',
    },
]
const occupancyChartSeries: DashboardChartSeries[] = [
    { key: 'occupancy', label: 'Forecast occupancy', color: '#006dfc' },
]
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

const formatPercent = (value: number) => `${value.toFixed(1)}%`

const modelLabel = (model: string) =>
    model.toLowerCase() === 'sarimax'
        ? 'SARIMAX'
        : model.replaceAll('_', ' ')

const Skeleton = ({ className = '' }: { className?: string }) => (
    <div
        aria-hidden="true"
        className={`animate-pulse rounded bg-slate-200/80 motion-reduce:animate-none ${className}`}
    />
)

const RevenueHeroSkeleton = () => (
    <div role="status" aria-label="Loading revenue" className="min-w-0 px-1">
        <span className="sr-only">Loading revenue</span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Revenue
        </p>
        <Skeleton className="mt-2 h-12 w-48 rounded-md sm:h-16 sm:w-64" />
        <Skeleton className="mt-3 h-3 w-32 rounded-sm" />
    </div>
)

const RevenueChartSkeleton = () => (
    <div role="status" aria-label="Loading revenue trend" className="py-2">
        <span className="sr-only">Loading revenue trend</span>
        <div className="relative h-48 w-full sm:h-56" aria-hidden="true">
            <div className="absolute inset-y-2 left-0 flex w-10 flex-col justify-between py-1">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-2 w-7 rounded-sm" />
                ))}
            </div>
            <div className="absolute inset-y-4 left-12 right-2">
                <div className="flex h-full flex-col justify-between">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-px w-full bg-slate-100" />
                    ))}
                </div>
                <div className="absolute inset-x-0 bottom-6 top-8 flex items-end gap-1 px-1">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <Skeleton key={i} className="h-3/4 flex-1 rounded-sm" />
                    ))}
                </div>
            </div>
            <div className="absolute bottom-0 left-12 right-2 flex justify-between gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-2 w-6 rounded-sm sm:w-8" />
                ))}
            </div>
        </div>
    </div>
)

const KpiStripSkeleton = ({ className = '' }: { className?: string }) => (
    <div
        role="status"
        aria-label="Loading key metrics"
        className={`flex flex-wrap items-stretch gap-x-4 gap-y-2 ${className}`}
    >
        <span className="sr-only">Loading key metrics</span>
        {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex min-h-11 items-center gap-1.5 px-1" aria-hidden="true">
                <Skeleton className="h-2.5 w-16 rounded-sm sm:w-20" />
                <Skeleton className="h-4 w-12 rounded-sm" />
                <Skeleton className="h-2.5 w-9 rounded-sm" />
            </div>
        ))}
    </div>
)

const ActionCenterSkeleton = () => (
    <ul
        role="status"
        aria-label="Loading action items"
        className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4"
    >
        <li className="sr-only sm:col-span-2 lg:col-span-4">Loading action items</li>
        {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} aria-hidden="true">
                <div className="flex min-h-12 items-center gap-3 rounded-sm py-2">
                    <Skeleton className="size-4 shrink-0 rounded" />
                    <Skeleton className="h-3 flex-1 rounded-sm" />
                    <Skeleton className="h-4 w-8 rounded-sm" />
                </div>
            </li>
        ))}
    </ul>
)

const AnalysisChartSkeleton = () => (
    <div role="status" aria-label="Loading chart" className="mt-4 py-2">
        <span className="sr-only">Loading chart</span>
        <div className="relative h-56 w-full sm:h-64" aria-hidden="true">
            <div className="absolute inset-y-2 left-0 flex w-12 flex-col justify-between py-1">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-2 w-8 rounded-sm" />
                ))}
            </div>
            <div className="absolute inset-y-6 left-14 right-2">
                <div className="flex h-full flex-col justify-between">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-px w-full bg-slate-100" />
                    ))}
                </div>
                <Skeleton className="absolute inset-x-2 bottom-8 top-10 rounded-md opacity-40" />
            </div>
            <div className="absolute bottom-0 left-14 right-2 flex justify-between gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-2 w-6 rounded-sm" />
                ))}
            </div>
        </div>
    </div>
)

const ForecastSummarySkeleton = () => (
    <div role="status" aria-label="Loading forecast summary" className="mt-3">
        <span className="sr-only">Loading forecast summary</span>
        <ul className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
            {Array.from({ length: 2 }).map((_, i) => (
                <li
                    key={i}
                    className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm"
                >
                    <Skeleton className="h-3 w-28 rounded-sm" />
                    <Skeleton className="mt-3 h-8 w-24 rounded-sm" />
                    <Skeleton className="mt-2 h-3 w-4/5 rounded-sm" />
                </li>
            ))}
        </ul>
    </div>
)

const ServiceRevenueSkeleton = () => (
    <ol role="status" aria-label="Loading service revenue" className="mt-4 divide-y divide-[rgba(0,0,0,0.06)]">
        <li className="sr-only">Loading service revenue</li>
        {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} aria-hidden="true" className="flex min-h-12 items-center gap-3 py-2">
                <Skeleton className="h-3.5 min-w-0 flex-1 rounded-sm" />
                <Skeleton className="h-3 w-20 rounded-sm" />
                <Skeleton className="h-3 w-16 rounded-sm" />
            </li>
        ))}
    </ol>
)

const FunnelSkeleton = () => (
    <div role="status" aria-label="Loading booking funnel" className="mt-5">
        <span className="sr-only">Loading booking funnel</span>
        <ol className="space-y-4" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
                <li key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                        <Skeleton className="h-3 w-24 rounded-sm" />
                        <Skeleton className="h-3 w-12 rounded-sm" />
                    </div>
                    <Skeleton className={`mt-2 h-2 rounded-full ${i === 0 ? 'w-full' : i === 1 ? 'w-2/3' : 'w-1/3'}`} />
                    {i > 0 && <Skeleton className="mt-1 h-2.5 w-40 rounded-sm" />}
                </li>
            ))}
        </ol>
    </div>
)

const OccupancyStatsSkeleton = () => (
    <div role="status" aria-label="Loading occupancy and yield" className="mt-3">
        <span className="sr-only">Loading occupancy and yield</span>
        <div className="flex flex-wrap items-stretch gap-x-5 gap-y-2" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex min-h-11 items-center gap-1.5 px-1">
                    <Skeleton className="h-2.5 w-14 rounded-sm" />
                    <Skeleton className="h-4 w-12 rounded-sm" />
                </div>
            ))}
        </div>
        <div className="mt-3 border-t border-[rgba(0,0,0,0.06)] pt-3" aria-hidden="true">
            <Skeleton className="h-2.5 w-28 rounded-sm" />
            <Skeleton className="mt-2 h-5 w-24 rounded-sm" />
            <Skeleton className="mt-2 h-3 w-full max-w-sm rounded-sm" />
        </div>
    </div>
)

const WeekdaySkeleton = () => (
    <div role="status" aria-label="Loading weekday breakdown" className="mt-4 space-y-3">
        <span className="sr-only">Loading weekday breakdown</span>
        {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3" aria-hidden="true">
                <Skeleton className="h-2.5 w-7 rounded-sm" />
                <Skeleton className={`h-1 rounded-full ${['w-2/3', 'w-1/2', 'w-3/5', 'w-2/5', 'w-4/5', 'w-full', 'w-3/4'][i]}`} />
                <Skeleton className="h-3 w-14 rounded-sm" />
            </div>
        ))}
    </div>
)

const RecentBookingsSkeleton = () => (
    <div role="status" aria-label="Loading recent bookings">
        <span className="sr-only">Loading recent bookings</span>
        <div className="hidden sm:block" aria-hidden="true">
            <div className="overflow-x-auto">
                <div className="w-full min-w-[28rem]">
                    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6rem_5rem] gap-3 border-b border-[rgba(0,0,0,0.06)] pb-2 pt-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-2.5 w-16 rounded-sm" />
                        ))}
                    </div>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6rem_5rem] items-center gap-3 border-b border-[rgba(0,0,0,0.06)] py-3">
                            <div className="space-y-1.5">
                                <Skeleton className="h-3.5 w-32 rounded-sm" />
                                <Skeleton className="h-2.5 w-24 rounded-sm" />
                            </div>
                            <Skeleton className="h-3 w-28 rounded-sm" />
                            <Skeleton className="h-3 w-16 rounded-sm" />
                            <Skeleton className="ml-auto h-3 w-14 rounded-sm" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <ul className="divide-y divide-[rgba(0,0,0,0.06)] sm:hidden" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex min-h-11 items-center gap-3 py-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-32 rounded-sm" />
                        <Skeleton className="h-2.5 w-24 rounded-sm" />
                    </div>
                    <Skeleton className="h-3 w-14 rounded-sm" />
                </li>
            ))}
        </ul>
    </div>
)

const Dashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const range = parseRange(searchParams.get('range'))
    const [forecastPreset, setForecastPreset] =
        useState<(typeof forecastPresets)[number]>('30')
    const [backtestRange, setBacktestRange] =
        useState<(typeof backtestRanges)[number]>(14)
    const [includeHolidays, setIncludeHolidays] = useState(true)
    const [includeWeekends, setIncludeWeekends] = useState(true)
    const [refreshToken, setRefreshToken] = useState(0)
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
    const [result, setResult] = useState<{
        key: string
        data: DashboardSummary
    } | null>(null)
    const [failure, setFailure] = useState<{
        key: string
        message: string
    } | null>(null)
    const [analysisView, setAnalysisView] = useState<AnalysisView>('accuracy')
    const [showAllBookings, setShowAllBookings] = useState(false)

    const requestKey = [
        range,
        forecastPreset,
        backtestRange,
        includeHolidays,
        includeWeekends,
        refreshToken,
    ].join('|')

    useEffect(() => {
        let active = true
        const options: DashboardForecastOptions = {
            forecastPreset,
            backtestRange,
            includeHolidays,
            includeWeekends,
        }

        getDashboard(range, options)
            .then(({ data: envelope }) => {
                if (active) {
                    setResult({ key: requestKey, data: envelope.data })
                    setFailure(null)
                    setLastUpdatedAt(new Date())
                }
            })
            .catch((requestFailure) => {
                if (active) {
                    setFailure({
                        key: requestKey,
                        message: getApiErrorMessage(
                            requestFailure,
                            'Unable to load dashboard data.',
                        ),
                    })
                }
            })

        return () => {
            active = false
        }
    }, [
        range,
        forecastPreset,
        backtestRange,
        includeHolidays,
        includeWeekends,
        refreshToken,
        requestKey,
    ])

    const data = result?.key === requestKey ? result.data : null
    const loading = data === null && failure?.key !== requestKey
    const error = failure?.key === requestKey ? failure.message : ''
    const bookings = useMemo(() => data?.recent_bookings ?? [], [data])
    const funnelSteps = data?.funnel.steps ?? []
    const demandForecast = data?.demand_forecast
    const accuracyPoints = useMemo(
        () => demandForecast?.accuracy?.points ?? [],
        [demandForecast],
    )
    const occupancyPoints = useMemo<DashboardChartPoint[]>(
        () =>
            (demandForecast?.forecast ?? [])
                .slice(0, Number(forecastPreset))
                .map((point) => ({
                    label: point.label,
                    annotation: point.holiday ?? undefined,
                    values: { occupancy: point.expected_occupancy },
                })),
        [demandForecast, forecastPreset],
    )
    const reportHref = useCallback(
        (
            report: AdminReportKind,
            filters: { status?: string; date_field?: string } = {},
        ) => {
            const params = new URLSearchParams({ report })
            if (data?.start) params.set('from', data.start)
            if (data?.end) params.set('to', data.end)
            if (filters.status) params.set('status', filters.status)
            if (filters.date_field) params.set('date_field', filters.date_field)
            return `/reports?${params.toString()}`
        },
        [data],
    )
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
    const revenueChartPoints = useMemo<DashboardChartPoint[]>(
        () =>
            (data?.series ?? []).map((point) => ({
                label: point.date.slice(5),
                values: { revenue: point.revenue },
            })),
        [data],
    )
    const accuracyChartPoints = useMemo<DashboardChartPoint[]>(
        () =>
            accuracyPoints.map((point) => ({
                label: point.label,
                values: {
                    actual: point.actual_room_nights,
                    predicted: point.predicted_room_nights,
                },
            })),
        [accuracyPoints],
    )
    const kpis = useMemo(
        () => [
            {
                label: 'New bookings',
                value: data
                    ? numberFormatter.format(metrics?.new_bookings ?? 0)
                    : '-',
                delta: data ? comparison?.new_bookings : undefined,
                href: data ? reportHref('bookings') : undefined,
                tooltip: 'Bookings created this period. Click to view.',
            },
            {
                label: 'Occupancy',
                value: data ? formatPercent(data.operational.occupancy) : '-',
                tooltip: 'Share of room-nights booked.',
            },
            {
                label: 'Churn',
                value: data ? formatPercent(metrics?.churn_rate ?? 0) : '-',
                delta: data ? comparison?.churn_rate : undefined,
                deltaDirection: 'lower' as const,
                href: data
                    ? reportHref('bookings', { status: 'cancelled' })
                    : undefined,
                tooltip: 'Share of bookings cancelled (lower is better).',
            },
            {
                label: 'Conversion',
                value: data ? formatPercent(metrics?.conversion_rate ?? 0) : '-',
                delta: data ? comparison?.conversion_rate : undefined,
                href: data ? reportHref('bookings') : undefined,
                tooltip: 'Share of visits that became paid bookings.',
            },
        ],
        [data, metrics, comparison, reportHref],
    )
    const isAccuracy = analysisView === 'accuracy'
    const analysisChartPoints = isAccuracy
        ? accuracyChartPoints
        : occupancyPoints
    const analysisChartSeries = isAccuracy
        ? accuracyChartSeries
        : occupancyChartSeries
    const visibleBookings = useMemo(
        () => (showAllBookings ? bookings : bookings.slice(0, 5)),
        [bookings, showAllBookings],
    )
    const actionItems = useMemo(
        () => [
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
        ],
        [actionCenter],
    )

    const statusMessage = loading
        ? 'Loading dashboard data.'
        : error
          ? error
          : lastUpdatedAt
            ? `Dashboard updated ${lastUpdatedAt.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
              })}.`
            : ''

    return (
        <main className="min-h-screen bg-white pb-12 text-slate-900">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <div className="-mx-4 border-b border-[rgba(0,0,0,0.06)] bg-white px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    <AdminPageHeader
                        eyebrow="Administration / Overview"
                        title="Dashboard"
                        subtitle="A working view of stays, guest activity, and cash flow."
                        action={
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <WarmTooltip
                                    content="Select date range."
                                    side="bottom"
                                    size="sm"
                                >
                                    <span className="inline-flex">
                                        <AdminFilterPills
                                            label="Dashboard date range"
                                            value={range}
                                            onChange={setRange}
                                            options={ranges.map((value) => ({
                                                value,
                                                label: `${value} days`,
                                            }))}
                                        />
                                    </span>
                                </WarmTooltip>
                                <WarmTooltip
                                    content="Reload data."
                                    side="bottom"
                                    size="sm"
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setRefreshToken((token) => token + 1)
                                        }
                                        aria-label="Refresh dashboard"
                                        disabled={loading}
                                        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                                    >
                                        <RefreshCw
                                            className={`size-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`}
                                            aria-hidden="true"
                                        />
                                        <span className="hidden sm:inline">
                                            Refresh
                                        </span>
                                    </button>
                                </WarmTooltip>
                                {lastUpdatedAt && !loading && (
                                    <WarmTooltip
                                        content="Last updated time."
                                        side="bottom"
                                        size="sm"
                                    >
                                        <span className="w-full text-right text-[11px] text-slate-500 sm:w-auto">
                                            Updated{' '}
                                            {lastUpdatedAt.toLocaleTimeString([], {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </WarmTooltip>
                                )}
                            </div>
                        }
                    />
                    <p className="sr-only" aria-live="polite" aria-atomic="true">
                        {statusMessage}
                    </p>
                </div>

                <section


                    className="grid gap-6 md:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)] md:items-center"


                    aria-busy={loading}


                >


                    {loading ? (


                        <RevenueHeroSkeleton />


                    ) : (


                        <div className="min-w-0 px-1">


                            <div className="flex items-center gap-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Revenue
                                </p>
                                <WarmTooltip
                                    content="Paid revenue this period."
                                    side="top"
                                    size="sm"
                                >
                                    <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-slate-400 hover:text-slate-600">
                                        <Info className="size-3.5" aria-hidden="true" />
                                        <span className="sr-only">About revenue</span>
                                    </span>
                                </WarmTooltip>
                            </div>
                            {data ? (
                                <WarmTooltip
                                    content="Open revenue report."
                                    side="bottom"
                                    size="sm"
                                >
                                    <Link
                                        to={reportHref('revenue')}
                                        className={`mt-2 inline-block rounded-sm font-jakarta-serif text-5xl font-bold leading-none tracking-tight text-slate-950 tabular-nums hover:text-[#006dfc] sm:text-6xl ${focusRing}`}
                                    >
                                        {money(metrics?.revenue ?? 0)}
                                    </Link>
                                </WarmTooltip>


                            ) : (


                                <p className="mt-2 font-jakarta-serif text-5xl font-bold leading-none tracking-tight text-slate-950 tabular-nums sm:text-6xl">


                                    —


                                </p>


                            )}


                            {data && comparison?.revenue && (


                                <p


                                    className={`mt-3 font-mono text-xs font-medium tabular-nums ${comparison.revenue.delta > 0


                                            ? 'text-emerald-700'


                                            : comparison.revenue.delta < 0


                                                ? 'text-rose-700'


                                                : 'text-slate-500'


                                        }`}


                                >


                                    {comparison.revenue.percent !== null


                                        ? `${comparison.revenue.percent > 0 ? '+' : ''}${comparison.revenue.percent}%`


                                        : `${comparison.revenue.delta > 0 ? '+' : ''}${money(comparison.revenue.delta)}`}


                                    <span className="ml-1 text-slate-500">


                                        vs prior period


                                    </span>


                                </p>


                            )}


                        </div>


                    )}



                    <AdminCard className="min-w-0 border-0 shadow-none" padding={false}>


                        <div className="px-3 pb-4 pt-3 sm:px-5">


                            {loading ? (


                                <RevenueChartSkeleton />


                            ) : error ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                                    <p className="text-sm text-slate-600">
                                        Revenue trend unavailable.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setRefreshToken((token) => token + 1)
                                        }
                                        className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.12)] px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : revenueChartPoints.length === 0 ? (


                                <AdminEmptyState


                                    icon={CreditCard}


                                    state="empty"


                                    heading="No revenue yet"


                                    subtitle="Paid bookings will appear here as payments are recorded."


                                    ctaLabel="Open revenue report"


                                    href="/reports?report=revenue"


                                />


                            ) : (


                                <DashboardLineChart


                                    points={revenueChartPoints}


                                    series={revenueChartSeries}


                                    ariaLabel={`Daily revenue for the last ${range} days`}


                                    formatValue={money}


                                />


                            )}


                        </div>


                    </AdminCard>


                </section>

                {loading ? (


                    <KpiStripSkeleton className="border-b border-[rgba(0,0,0,0.06)] pb-4" />


                ) : (


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
                            deltaDirection: stat.deltaDirection,
                            href: stat.href,
                            tooltip: stat.tooltip,
                        }))}
                        className="border-b border-[rgba(0,0,0,0.06)] pb-4"
                    />


                )}

                {error && (
                    <div
                        role="alert"
                        className="flex items-center gap-2 text-sm text-rose-700"
                    >
                        <CircleAlert className="size-4" aria-hidden="true" />
                        {error}
                    </div>
                )}

                <section>
                    <AdminCard>
                        <div className="flex items-center gap-1.5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Needs attention
                            </p>
                            <WarmTooltip
                                content="Items that may need your review."
                                side="top"
                                size="sm"
                            >
                                <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-slate-400 hover:text-slate-600">
                                    <Info className="size-3.5" aria-hidden="true" />
                                    <span className="sr-only">About action center</span>
                                </span>
                            </WarmTooltip>
                        </div>
                        <h2 className="mt-1 font-jakarta-serif text-xl font-bold tracking-tight">
                            Action center
                        </h2>
                        {loading ? (

                            <ActionCenterSkeleton />

                        ) : !data ? (
                            <div className="mt-3 flex flex-wrap items-center gap-3 py-4">
                                <p className="text-sm text-slate-600">
                                    Action items unavailable.
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRefreshToken((token) => token + 1)
                                    }
                                    className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.12)] px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                                >
                                    Retry
                                </button>
                            </div>
                        ) : (

                            <ul className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">

                                {actionItems.map((item) => {

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

                                                    className={`font-mono text-sm font-semibold tabular-nums ${item.count > 0

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

                        )}
                    </AdminCard>
                </section>

                <section aria-labelledby="forecast-title" className="space-y-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Demand intelligence
                                </p>
                                <WarmTooltip
                                    content="Occupancy forecasts from booking history."
                                    side="top"
                                    size="sm"
                                >
                                    <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-slate-400 hover:text-slate-600">
                                        <Info className="size-3.5" aria-hidden="true" />
                                        <span className="sr-only">About demand intelligence</span>
                                    </span>
                                </WarmTooltip>
                            </div>
                            <h2
                                id="forecast-title"
                                className="mt-1 font-jakarta-serif text-2xl font-bold tracking-tight"
                            >
                                Occupancy forecast
                            </h2>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                                See expected paid days and occupancy by day,
                                with a backtest of the model's accuracy.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {[
                            {
                                label: 'Philippine holidays',
                                checked: includeHolidays,
                                onChange: setIncludeHolidays,
                            },
                            {
                                label: 'Weekend demand',
                                checked: includeWeekends,
                                onChange: setIncludeWeekends,
                            },
                        ].map((option) => (
                            <label
                                key={option.label}
                                className="inline-flex min-h-11 items-center gap-2 text-xs text-slate-700"
                            >
                                <input
                                    type="checkbox"
                                    checked={option.checked}
                                    onChange={(event) =>
                                        option.onChange(event.target.checked)
                                    }
                                    className="size-4 accent-[#006dfc]"
                                />
                                <WarmTooltip
                                    content={
                                        option.label === 'Philippine holidays'
                                            ? 'Include holidays in demand forecasts.'
                                            : 'Include weekends in demand forecasts.'
                                    }
                                    side="top"
                                    size="sm"
                                >
                                    <span>{option.label}</span>
                                </WarmTooltip>
                            </label>
                        ))}
                    </div>

                    <div className="flex gap-2 border-b border-[rgba(0,0,0,0.06)]">
                        {[
                            {
                                key: 'accuracy' as const,
                                label: 'Backtest accuracy',
                                tip: 'Compare actual vs predicted paid days.',
                            },
                            {
                                key: 'forecast' as const,
                                label: 'Occupancy outlook',
                                tip: 'View forecast occupancy by day.',
                            },
                        ].map((tab) => (
                            <WarmTooltip
                                key={tab.key}
                                content={tab.tip}
                                side="bottom"
                                size="sm"
                            >
                                <button
                                    type="button"
                                    aria-pressed={analysisView === tab.key}
                                    onClick={() => setAnalysisView(tab.key)}
                                    className={`min-h-11 border-b-2 px-3 text-xs font-semibold transition-colors ${focusRing} ${analysisView === tab.key
                                            ? 'border-[#006dfc] text-[#006dfc]'
                                            : 'border-transparent text-slate-500 hover:text-slate-900'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            </WarmTooltip>
                        ))}
                    </div>

                    <AdminCard className="min-w-0">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {isAccuracy
                                        ? 'Backtest accuracy'
                                        : 'Predictive outlook'}
                                </p>
                                <h3 className="mt-1 font-jakarta-serif text-xl font-bold tracking-tight">
                                    {isAccuracy
                                        ? 'Actual vs predicted paid days'
                                        : 'Forecast occupancy'}
                                </h3>
                                <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                                    {isAccuracy
                                        ? 'Compare recent paid days with the SARIMAX backtest.'
                                        : 'Expected share of available paid-day capacity occupied each day.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-end gap-3">
                                <label className="grid gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    <WarmTooltip
                                        content={
                                            isAccuracy
                                                ? 'Past days to compare results.'
                                                : 'Days to forecast occupancy.'
                                        }
                                        side="top"
                                        size="sm"
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            {isAccuracy
                                                ? 'Backtest window'
                                                : 'Forecast window'}
                                            <Info className="size-3" aria-hidden="true" />
                                        </span>
                                    </WarmTooltip>
                                    <select
                                        value={
                                            isAccuracy
                                                ? backtestRange
                                                : forecastPreset
                                        }
                                        onChange={(event) => {
                                            if (isAccuracy) {
                                                setBacktestRange(
                                                    Number(
                                                        event.target.value,
                                                    ) as (typeof backtestRanges)[number],
                                                )
                                            } else {
                                                setForecastPreset(
                                                    event.target
                                                        .value as (typeof forecastPresets)[number],
                                                )
                                            }
                                        }}
                                        className={`min-h-11 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 text-xs font-medium normal-case tracking-normal text-slate-800 ${focusRing}`}
                                    >
                                        {isAccuracy
                                            ? backtestRanges.map((days) => (
                                                <option
                                                    key={days}
                                                    value={days}
                                                >
                                                    Last {days} days
                                                </option>
                                            ))
                                            : forecastPresets.map((days) => (
                                                <option
                                                    key={days}
                                                    value={days}
                                                >
                                                    {days} days
                                                </option>
                                            ))}
                                    </select>
                                </label>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <span className="rounded-full bg-slate-50 px-3 py-1.5 font-mono text-[10px] font-medium capitalize text-slate-600">
                                {modelLabel(demandForecast?.model ?? 'sarimax')}
                            </span>
                            {isAccuracy && demandForecast?.accuracy && (
                                <WarmTooltip
                                    content="Prediction error (lower is better)."
                                    side="top"
                                    size="sm"
                                >
                                    <span className="font-mono text-[10px] tabular-nums text-slate-500">
                                        MAE {demandForecast.accuracy.mae}
                                        {demandForecast.accuracy.mape !== null &&
                                            ` · MAPE ${demandForecast.accuracy.mape}%`}
                                        {demandForecast.accuracy.wape != null &&
                                            ` · WAPE ${demandForecast.accuracy.wape}%`}
                                    </span>
                                </WarmTooltip>
                            )}
                            <ul
                                className="flex flex-wrap gap-x-4 gap-y-2"
                                aria-label="Chart legend"
                            >
                                {analysisChartSeries.map((series) => (
                                    <li
                                        key={series.key}
                                        className="inline-flex items-center gap-2 text-[10px] text-slate-600"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="w-4 border-t-2"
                                            style={{
                                                borderColor: series.color,
                                                borderTopStyle:
                                                    series.strokeDasharray
                                                        ? 'dashed'
                                                        : 'solid',
                                            }}
                                        />
                                        {series.label}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {loading ? (
                            <AnalysisChartSkeleton />
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <p className="text-sm text-slate-600">
                                    {isAccuracy
                                        ? 'Model accuracy unavailable.'
                                        : 'Occupancy forecast unavailable.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRefreshToken((token) => token + 1)
                                    }
                                    className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.12)] px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                                >
                                    Retry
                                </button>
                            </div>
                        ) : isAccuracy &&
                            accuracyChartPoints.length === 0 ? (
                            <p className="py-16 text-center text-sm text-slate-500">
                                Not enough stay history to compare a forecast
                                with actual results yet.
                            </p>
                        ) : !isAccuracy && occupancyPoints.length === 0 ? (
                            <p className="py-16 text-center text-sm text-slate-500">
                                Occupancy projections are unavailable for this
                                forecast window.
                            </p>
                        ) : (
                            <div className="mt-4">
                                <DashboardLineChart
                                    points={analysisChartPoints}
                                    series={analysisChartSeries}
                                    ariaLabel={
                                        isAccuracy
                                            ? `Actual and predicted paid days over the last ${demandForecast?.accuracy?.window_days ?? backtestRange} days`
                                            : `Forecast occupancy over the next ${forecastPreset} days`
                                    }
                                    formatValue={
                                        isAccuracy ? undefined : formatPercent
                                    }
                                />
                            </div>
                        )}
                    </AdminCard>

                    <AdminCard>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Forecast summary
                                </p>
                                <h3 className="mt-1 font-jakarta-serif text-xl font-bold tracking-tight">
                                    Demand outlook
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {demandForecast?.forecast_window
                                        ? `${demandForecast.forecast_window.start} to ${demandForecast.forecast_window.end}`
                                        : 'Expected demand for the selected window.'}
                                </p>
                            </div>
                            <span className="font-mono text-xs tabular-nums text-slate-500">
                                {demandForecast?.forecast.length ?? 0} days
                            </span>
                        </div>
                        {loading ? (
                            <ForecastSummarySkeleton />
                        ) : error ? (
                            <div className="flex flex-wrap items-center gap-3 py-8">
                                <p className="text-sm text-slate-600">
                                    Forecast summary unavailable.
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRefreshToken((token) => token + 1)
                                    }
                                    className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.12)] px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                                >
                                    Retry
                                </button>
                            </div>
                        ) : !demandForecast ||
                          demandForecast.forecast.length === 0 ? (
                            <p className="py-8 text-sm text-slate-500">
                                No forecast data is available for this window.
                            </p>
                        ) : (
                            <>
                                <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                                    <li className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
                                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                            Average occupancy
                                        </p>
                                        <p className="mt-2 font-jakarta-serif text-3xl font-bold tracking-tight text-slate-900">
                                            {formatPercent(
                                                demandForecast.average_forecast_occupancy,
                                            )}
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            Across the selected forecast window.
                                        </p>
                                    </li>
                                    <li className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
                                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                            Expected paid days
                                        </p>
                                        <p className="mt-2 font-jakarta-serif text-3xl font-bold tracking-tight text-slate-900">
                                            {numberFormatter.format(
                                                demandForecast.expected_room_nights,
                                            )}
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            Total paid 22-hour stays projected.
                                        </p>
                                    </li>
                                    <li className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
                                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                            Peak day
                                        </p>
                                        <p className="mt-2 font-jakarta-serif text-3xl font-bold tracking-tight text-slate-900">
                                            {demandForecast.peak_day?.label ?? '—'}
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            {demandForecast.peak_day
                                                ? `${formatPercent(demandForecast.peak_day.expected_occupancy)} projected occupancy`
                                                : 'No peak day projected.'}
                                        </p>
                                    </li>
                                    <li className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-4 shadow-sm">
                                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                            Holiday dates
                                        </p>
                                        <p className="mt-2 font-jakarta-serif text-3xl font-bold tracking-tight text-slate-900">
                                            {demandForecast.holiday_days}
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            Holidays inside the forecast window.
                                        </p>
                                    </li>
                                </ul>
                                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label="Forecast factors">
                                    {demandForecast.factors.map((factor) => (
                                        <li key={factor.key}>
                                            <WarmTooltip
                                                content={factor.impact}
                                                side="top"
                                                size="sm"
                                            >
                                                <span className="text-[10px] text-slate-600 underline decoration-dotted underline-offset-4">
                                                    {factor.label}
                                                </span>
                                            </WarmTooltip>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </AdminCard>
                </section>

                <section className="grid gap-8 lg:grid-cols-2">
                    <AdminCard>
                        <div className="flex items-center gap-1.5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Revenue mix
                            </p>
                            <WarmTooltip
                                content="Top services by revenue. Click to manage."
                                side="top"
                                size="sm"
                            >
                                <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-slate-400 hover:text-slate-600">
                                    <Info className="size-3.5" aria-hidden="true" />
                                    <span className="sr-only">About revenue by service</span>
                                </span>
                            </WarmTooltip>
                        </div>
                        <h2 className="mt-1 font-jakarta-serif text-xl font-bold tracking-tight">
                            By service
                        </h2>
                        {loading ? (
                            <ServiceRevenueSkeleton />
                        ) : error ? (
                            <div className="mt-4 flex flex-wrap items-center gap-3 py-4">
                                <p className="text-sm text-slate-600">
                                    Service revenue unavailable.
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRefreshToken((token) => token + 1)
                                    }
                                    className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.12)] px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                                >
                                    Retry
                                </button>
                            </div>
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
                            Conversion
                        </p>
                        <h2 className="mt-1 font-jakarta-serif text-xl font-bold tracking-tight">
                            Booking funnel
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Visitors → booking starts → paid reservations
                        </p>
                        {loading ? (
                            <FunnelSkeleton />
                        ) : error ? (
                            <div className="flex flex-wrap items-center gap-3 py-8">
                                <p className="text-sm text-slate-600">
                                    Funnel data unavailable.
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRefreshToken((token) => token + 1)
                                    }
                                    className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.12)] px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                                >
                                    Retry
                                </button>
                            </div>
                        ) : funnelSteps.every((step) => step.count === 0) ? (
                            <p className="py-8 text-sm text-slate-500">
                                No visitor or booking activity in this period.
                            </p>
                        ) : (
                            <>
                                <ol
                                    className="mt-5 space-y-4"
                                    aria-label="Visitor to paid booking funnel"
                                >
                                    {funnelSteps.map((step) => {
                                        const firstCount =
                                            funnelSteps[0]?.count ?? 0
                                        const width =
                                            firstCount > 0
                                                ? Math.max(
                                                    step.count > 0 ? 2 : 0,
                                                    Math.min(
                                                        100,
                                                        (step.count /
                                                            firstCount) *
                                                        100,
                                                    ),
                                                )
                                                : 0

                                        return (
                                            <li key={step.key}>
                                                <div className="flex items-baseline justify-between gap-3">
                                                    <span className="text-xs font-medium text-slate-700">
                                                        {step.label}
                                                    </span>
                                                    <span className="font-mono text-xs font-semibold tabular-nums text-slate-900">
                                                        {numberFormatter.format(
                                                            step.count,
                                                        )}
                                                    </span>
                                                </div>
                                                <div
                                                    className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                                                    role="img"
                                                    aria-label={`${step.label}: ${width.toFixed(1)}% of visitors`}
                                                >
                                                    <div
                                                        className="h-full rounded-full bg-[#006dfc]"
                                                        style={{
                                                            width: `${width}%`,
                                                        }}
                                                    />
                                                </div>
                                                {step.dropoff !== null &&
                                                    step.dropoff_rate !==
                                                    null && (
                                                        <p className="mt-1 text-[10px] text-slate-500">
                                                            {
                                                                numberFormatter.format(
                                                                    step.dropoff,
                                                                )
                                                            }{' '}
                                                            dropped off ·{' '}
                                                            {formatPercent(
                                                                step.dropoff_rate,
                                                            )}
                                                        </p>
                                                    )}
                                            </li>
                                        )
                                    })}
                                </ol>
                                <p className="mt-4 border-t border-[rgba(0,0,0,0.06)] pt-3 text-[10px] leading-5 text-slate-500">
                                    Stage totals are period counts, not a
                                    user-level cohort.{' '}
                                    {numberFormatter.format(
                                        data?.funnel.dropoff_total ?? 0,
                                    )}{' '}
                                    total stage drop-offs.
                                </p>
                            </>
                        )}
                    </AdminCard>
                </section>

                <section className="grid gap-8 lg:grid-cols-2">
                    <AdminCard>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Stay performance
                        </p>
                        <h2 className="mt-1 font-jakarta-serif text-xl font-bold tracking-tight">
                            Occupancy and yield
                        </h2>
                        {loading ? (

                            <OccupancyStatsSkeleton />

                        ) : (

                            <>

                                <AdminStatStrip
                                    className="mt-3 gap-x-5"
                                    stats={[
                                        {
                                            label: 'Occupancy',
                                            value: data
                                                ? `${data.operational.occupancy}%`
                                                : '-',
                                            tooltip:
                                                'Share of room-nights booked.',
                                        },
                                        {
                                            label: 'ADR',
                                            value: data
                                                ? money(data.operational.adr)
                                                : '-',
                                            tooltip:
                                                'Average revenue per sold room-night.',
                                        },
                                        {
                                            label: 'RevPAR',
                                            value: data
                                                ? money(data.operational.revpar)
                                                : '-',
                                            tooltip:
                                                'Revenue per available room-night.',
                                        },
                                    ]}
                                />

                                <div className="mt-3 border-t border-[rgba(0,0,0,0.06)] pt-3">
                                    <WarmTooltip
                                        content="Value of confirmed bookings in the next 30 days."
                                        side="top"
                                        size="sm"
                                    >
                                        <p className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            Booked next 30 days
                                            <Info className="size-3" aria-hidden="true" />
                                        </p>
                                    </WarmTooltip>

                                    <p className="mt-1 font-mono text-lg font-semibold tabular-nums">

                                        {data ? money(data.operational.booked_forward_revenue) : '—'}

                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-slate-500">

                                        Confirmed reservations already on the books; not a predictive estimate.

                                    </p>

                                </div>

                            </>

                        )}
                    </AdminCard>

                    <AdminCard>
                        <div className="flex items-center gap-1.5">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Weekly pattern
                            </p>
                            <WarmTooltip
                                content="Revenue by day of week."
                                side="top"
                                size="sm"
                            >
                                <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-slate-400 hover:text-slate-600">
                                    <Info className="size-3.5" aria-hidden="true" />
                                    <span className="sr-only">About revenue by day of week</span>
                                </span>
                            </WarmTooltip>
                        </div>
                        <h2 className="mt-1 font-jakarta-serif text-xl font-bold tracking-tight">
                            Revenue by day of week
                        </h2>
                        <div className="mt-4 space-y-3">
                            {loading && <WeekdaySkeleton />}
                            {!loading && error && (
                                <div className="flex flex-wrap items-center gap-3 py-4">
                                    <p className="text-sm text-slate-600">
                                        Weekday breakdown unavailable.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setRefreshToken((token) => token + 1)
                                        }
                                        className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.12)] px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                                    >
                                        Retry
                                    </button>
                                </div>
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
                </section>

                <section>
                    <AdminCard padding={false}>
                        <div className="px-5 pt-5">
                            <div className="flex items-center gap-1.5">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Reservations
                                </p>
                                <WarmTooltip
                                    content="Latest bookings. Click to view details."
                                    side="top"
                                    size="sm"
                                >
                                    <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm text-slate-400 hover:text-slate-600">
                                        <Info className="size-3.5" aria-hidden="true" />
                                        <span className="sr-only">About recent bookings</span>
                                    </span>
                                </WarmTooltip>
                            </div>
                            <h2 className="mt-1 font-jakarta-serif text-xl font-bold tracking-tight">
                                Recent bookings
                            </h2>
                            <WarmTooltip
                                content="Open full bookings report."
                                side="bottom"
                                size="sm"
                            >
                                <Link
                                    to="/reports?report=bookings"
                                    className={`mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-[#006dfc] ${focusRing}`}
                                >
                                    View bookings report
                                </Link>
                            </WarmTooltip>
                        </div>
                        <div className="px-5 pb-4 pt-2">
                            {loading ? (
                                <RecentBookingsSkeleton />
                            ) : error ? (
                                <div className="flex flex-wrap items-center gap-3 py-6">
                                    <p className="text-sm text-slate-600">
                                        Recent bookings unavailable.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setRefreshToken((token) => token + 1)
                                        }
                                        className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.12)] px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : bookings.length === 0 ? (
                                <AdminEmptyState
                                    icon={CalendarClock}
                                    state="empty"
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
                                            rows={visibleBookings}
                                            rowKey={(booking) => booking.reference}
                                        />
                                    </div>
                                    <ul className="divide-y divide-[rgba(0,0,0,0.06)] sm:hidden">
                                        {visibleBookings.map((booking) => (
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
                                    {bookings.length > 5 && (
                                        <div className="mt-3 flex justify-center border-t border-[rgba(0,0,0,0.06)] pt-2">
                                            <button
                                                type="button"
                                                aria-expanded={showAllBookings}
                                                onClick={() =>
                                                    setShowAllBookings(
                                                        (showAll) => !showAll,
                                                    )
                                                }
                                                className={`inline-flex min-h-11 items-center rounded-sm px-3 text-xs font-semibold text-[#006dfc] hover:bg-slate-50 ${focusRing}`}
                                            >
                                                {showAllBookings
                                                    ? 'Show fewer'
                                                    : `Show more (${bookings.length - visibleBookings.length})`}
                                            </button>
                                        </div>
                                    )}
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
