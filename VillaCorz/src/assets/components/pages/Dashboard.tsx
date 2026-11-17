import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
    CalendarClock,
    CircleAlert,
    CreditCard,
    MessageSquareText,
    Star,
} from 'lucide-react'
import { money } from '../../../lib/format'
import { getApiErrorMessage } from '../../../lib/apiError'
import {
    getDashboard,
    type DashboardForecastOptions,
} from '../../../services/dashboardService'
import { adjustServicePrice } from '../../../services/serviceService'
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
import AdminPageHeader from '../ui/AdminPageHeader'
import ConfirmDialog from '../offers/ConfirmDialog'

const ranges = [7, 30, 90] as const
type Range = (typeof ranges)[number]
const forecastPresets = ['14', '30', '60'] as const
const backtestRanges = [7, 14, 30] as const
type PriceRecommendation =
    DashboardSummary['pricing_insights']['recommendations'][number]
type AnalysisView = 'prescriptive' | 'predictive'

const numberFormatter = new Intl.NumberFormat('en-PH')
const revenueChartSeries: DashboardChartSeries[] = [
    { key: 'revenue', label: 'Revenue', color: '#006dfc' },
]
const accuracyChartSeries: DashboardChartSeries[] = [
    { key: 'actual', label: 'Actual bookings', color: '#64748b' },
    {
        key: 'predicted',
        label: 'Predicted bookings',
        color: '#006dfc',
        strokeDasharray: '6 4',
    },
]
const priceChartSeries: DashboardChartSeries[] = [
    { key: 'projected', label: 'Projected price', color: '#006dfc' },
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
    const [result, setResult] = useState<{
        key: string
        data: DashboardSummary
    } | null>(null)
    const [failure, setFailure] = useState<{
        key: string
        message: string
    } | null>(null)
    const [selectedPriceRecommendation, setSelectedPriceRecommendation] =
        useState<PriceRecommendation | null>(null)
    const [priceAdjustmentLoading, setPriceAdjustmentLoading] = useState(false)
    const [priceAdjustmentError, setPriceAdjustmentError] = useState('')
    const [priceAdjustmentNotice, setPriceAdjustmentNotice] = useState('')
    const [priceForecastServiceId, setPriceForecastServiceId] =
        useState<number | null>(null)
    const [analysisView, setAnalysisView] =
        useState<AnalysisView>('prescriptive')
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
    const bookings = data?.recent_bookings ?? []
    const funnelSteps = data?.funnel.steps ?? []
    const pricing = data?.pricing_insights
    const forecastPoints = pricing?.forecast.slice(0, Number(forecastPreset)) ?? []
    const recommendations = pricing?.recommendations ?? []
    const selectedForecastRecommendation =
        recommendations.find(
            (recommendation) =>
                recommendation.service_id === priceForecastServiceId,
        ) ?? recommendations[0]
    const accuracyPoints = pricing?.accuracy?.points ?? []
    const predictionPoints: DashboardChartPoint[] =
        selectedForecastRecommendation === undefined
            ? []
            : forecastPoints.map((point) => {
                  const peakDay =
                      selectedForecastRecommendation.direction === 'increase'
                          ? point.holiday !== null ||
                            point.expected_occupancy >= 55
                          : selectedForecastRecommendation.direction === 'decrease'
                            ? point.expected_occupancy < 40
                            : false

                  return {
                      label: point.label,
                      annotation: point.holiday ?? undefined,
                      values: {
                          projected: peakDay
                              ? selectedForecastRecommendation.suggested_price
                              : selectedForecastRecommendation.current_price,
                      },
                  }
              })
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

    const closePriceAdjustment = useCallback(() => {
        if (priceAdjustmentLoading) return
        setSelectedPriceRecommendation(null)
        setPriceAdjustmentError('')
    }, [priceAdjustmentLoading])

    const confirmPriceAdjustment = async () => {
        if (!selectedPriceRecommendation || priceAdjustmentLoading) return

        setPriceAdjustmentLoading(true)
        setPriceAdjustmentError('')
        setPriceAdjustmentNotice('')

        try {
            const response = await adjustServicePrice(
                selectedPriceRecommendation.service_id,
                selectedPriceRecommendation.suggested_price,
            )
            setPriceAdjustmentNotice(
                response.data.message ?? 'The price was updated.',
            )
            setPriceForecastServiceId(
                selectedPriceRecommendation.service_id,
            )
            setSelectedPriceRecommendation(null)
            setRefreshToken((token) => token + 1)
        } catch (adjustmentFailure) {
            setPriceAdjustmentError(
                getApiErrorMessage(
                    adjustmentFailure,
                    'Unable to update this price. Please try again.',
                ),
            )
        } finally {
            setPriceAdjustmentLoading(false)
        }
    }

    const metrics = data?.metrics
    const comparison = data?.comparison
    const actionCenter = data?.action_center
    const revenueChartPoints: DashboardChartPoint[] = (data?.series ?? []).map(
        (point) => ({
            label: point.date.slice(5),
            values: { revenue: point.revenue },
        }),
    )
    const accuracyChartPoints: DashboardChartPoint[] = accuracyPoints.map(
        (point) => ({
            label: point.label,
            values: {
                actual: point.actual_bookings,
                predicted: point.predicted_bookings,
            },
        }),
    )
    const kpis = [
        {
            label: 'New bookings',
            value: data ? numberFormatter.format(metrics?.new_bookings ?? 0) : '—',
            delta: data ? comparison?.new_bookings : undefined,
            href: data ? reportHref('bookings') : undefined,
        },
        {
            label: 'Occupancy',
            value: data ? formatPercent(data.operational.occupancy) : '—',
        },
        {
            label: 'Churn',
            value: data ? formatPercent(metrics?.churn_rate ?? 0) : '—',
            delta: data ? comparison?.churn_rate : undefined,
            deltaDirection: 'lower' as const,
            href: data ? reportHref('cancellations') : undefined,
        },
        {
            label: 'Conversion',
            value: data ? formatPercent(metrics?.conversion_rate ?? 0) : '—',
            delta: data ? comparison?.conversion_rate : undefined,
            href: data ? reportHref('bookings') : undefined,
        },
    ]
    const isPrescriptive = analysisView === 'prescriptive'
    const analysisChartPoints = isPrescriptive
        ? accuracyChartPoints
        : predictionPoints
    const analysisChartSeries = isPrescriptive
        ? accuracyChartSeries
        : priceChartSeries
    const visibleBookings = showAllBookings ? bookings : bookings.slice(0, 5)
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

                <section className="grid gap-6 md:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)] md:items-center">
                    <div className="min-w-0 px-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Revenue
                        </p>
                        {data ? (
                            <Link
                                to={reportHref('revenue')}
                                className={`mt-2 inline-block rounded-sm font-serif text-5xl font-bold leading-none tracking-tight text-slate-950 tabular-nums hover:text-[#006dfc] sm:text-6xl ${focusRing}`}
                            >
                                {money(metrics?.revenue ?? 0)}
                            </Link>
                        ) : (
                            <p className="mt-2 font-serif text-5xl font-bold leading-none tracking-tight text-slate-950 tabular-nums sm:text-6xl">
                                {loading ? '…' : '—'}
                            </p>
                        )}
                        {data && comparison?.revenue && (
                            <p
                                className={`mt-3 font-mono text-xs font-medium tabular-nums ${
                                    comparison.revenue.delta > 0
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
                                <p role="status" className="py-12 text-center text-sm text-slate-500">
                                    Loading revenue…
                                </p>
                            ) : error ? (
                                <p className="py-12 text-center text-sm text-slate-500">
                                    Revenue trend unavailable.
                                </p>
                            ) : revenueChartPoints.length === 0 ? (
                                <AdminEmptyState
                                    icon={CreditCard}
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
                    }))}
                    className="border-b border-[rgba(0,0,0,0.06)] pb-4"
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

                {priceAdjustmentNotice && (
                    <p role="status" className="text-sm text-emerald-700">
                        {priceAdjustmentNotice}
                    </p>
                )}

                <section>
                    <AdminCard>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Needs attention
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-tight">
                            Action center
                        </h2>
                        <ul className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
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

                <section aria-labelledby="pricing-title" className="space-y-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Demand intelligence
                            </p>
                            <h2
                                id="pricing-title"
                                className="mt-1 font-serif text-2xl font-bold tracking-tight"
                            >
                                Seasonal pricing
                            </h2>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                                Review model-led demand and price guidance. No
                                price changes until you confirm them.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <label className="grid gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Forecast window
                                <select
                                    value={forecastPreset}
                                    onChange={(event) =>
                                        setForecastPreset(
                                            event.target.value as (typeof forecastPresets)[number],
                                        )
                                    }
                                    className={`min-h-11 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 text-xs font-medium normal-case tracking-normal text-slate-800 ${focusRing}`}
                                >
                                    {forecastPresets.map((preset) => (
                                        <option key={preset} value={preset}>
                                            {preset} days
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="grid gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Backtest
                                <select
                                    value={backtestRange}
                                    onChange={(event) =>
                                        setBacktestRange(
                                            Number(event.target.value) as (typeof backtestRanges)[number],
                                        )
                                    }
                                    className={`min-h-11 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 text-xs font-medium normal-case tracking-normal text-slate-800 ${focusRing}`}
                                >
                                    {backtestRanges.map((days) => (
                                        <option key={days} value={days}>
                                            Last {days} days
                                        </option>
                                    ))}
                                </select>
                            </label>
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
                                {option.label}
                            </label>
                        ))}
                    </div>

                    <div className="flex gap-2 border-b border-[rgba(0,0,0,0.06)]">
                        {[
                            {
                                key: 'prescriptive' as const,
                                label: 'Prescriptive guidance',
                            },
                            {
                                key: 'predictive' as const,
                                label: 'Price prediction',
                            },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                aria-pressed={analysisView === tab.key}
                                onClick={() => setAnalysisView(tab.key)}
                                className={`min-h-11 border-b-2 px-3 text-xs font-semibold transition-colors ${focusRing} ${
                                    analysisView === tab.key
                                        ? 'border-[#006dfc] text-[#006dfc]'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <AdminCard className="min-w-0">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {isPrescriptive
                                        ? 'Prescriptive guidance'
                                        : 'Predictive outlook'}
                                </p>
                                <h3 className="mt-1 font-serif text-xl font-bold tracking-tight">
                                    {isPrescriptive
                                        ? 'Actual vs predicted bookings'
                                        : 'Predicted base price'}
                                </h3>
                                <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                                    {isPrescriptive
                                        ? 'Compare recent actual bookings with the SARIMAX backtest.'
                                        : 'Projected rates are advisory; changes require your confirmation below.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-end gap-3">
                                {!isPrescriptive &&
                                    recommendations.length > 0 && (
                                        <label className="grid gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                            Offer
                                            <select
                                                aria-label="Offer for price prediction"
                                                value={
                                                    selectedForecastRecommendation
                                                        ?.service_id ?? ''
                                                }
                                                onChange={(event) =>
                                                    setPriceForecastServiceId(
                                                        Number(
                                                            event.target.value,
                                                        ),
                                                    )
                                                }
                                                className={`min-h-11 max-w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 text-xs font-medium normal-case tracking-normal text-slate-800 ${focusRing}`}
                                            >
                                                {recommendations.map(
                                                    (recommendation) => (
                                                        <option
                                                            key={
                                                                recommendation.service_id
                                                            }
                                                            value={
                                                                recommendation.service_id
                                                            }
                                                        >
                                                            {
                                                                recommendation.name
                                                            }
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </label>
                                    )}
                                <label className="grid gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    {isPrescriptive
                                        ? 'Backtest window'
                                        : 'Forecast window'}
                                    <select
                                        value={
                                            isPrescriptive
                                                ? backtestRange
                                                : forecastPreset
                                        }
                                        onChange={(event) => {
                                            if (isPrescriptive) {
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
                                        {isPrescriptive
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
                                {modelLabel(pricing?.model ?? 'sarimax')}
                            </span>
                            {isPrescriptive && pricing?.accuracy && (
                                <span className="font-mono text-[10px] tabular-nums text-slate-500">
                                    MAE {pricing.accuracy.mae}
                                    {pricing.accuracy.mape !== null &&
                                        ` · MAPE ${pricing.accuracy.mape}%`}
                                </span>
                            )}
                            {isPrescriptive && (
                                <ul
                                    className="flex flex-wrap gap-x-4 gap-y-2"
                                    aria-label="Chart legend"
                                >
                                    {accuracyChartSeries.map((series) => (
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
                            )}
                        </div>

                        {loading ? (
                            <p
                                role="status"
                                className="py-16 text-center text-sm text-slate-500"
                            >
                                {isPrescriptive
                                    ? 'Checking recent forecast accuracy…'
                                    : 'Calculating price outlook…'}
                            </p>
                        ) : error ? (
                            <p className="py-16 text-center text-sm text-slate-500">
                                {isPrescriptive
                                    ? 'Model accuracy unavailable.'
                                    : 'Price prediction unavailable.'}
                            </p>
                        ) : isPrescriptive &&
                          accuracyChartPoints.length === 0 ? (
                            <p className="py-16 text-center text-sm text-slate-500">
                                Not enough booking history to compare a
                                forecast with actual results yet.
                            </p>
                        ) : !isPrescriptive &&
                          (predictionPoints.length === 0 ||
                              !selectedForecastRecommendation) ? (
                            <p className="py-16 text-center text-sm text-slate-500">
                                Price projections are unavailable until an
                                active offer has forecast data.
                            </p>
                        ) : (
                            <div className="mt-4">
                                <DashboardLineChart
                                    points={analysisChartPoints}
                                    series={analysisChartSeries}
                                    ariaLabel={
                                        isPrescriptive
                                            ? `Actual and predicted bookings over the last ${pricing?.accuracy?.window_days ?? backtestRange} days`
                                            : `Projected base prices for ${selectedForecastRecommendation?.name ?? 'the selected offer'} over the next ${forecastPreset} days`
                                    }
                                    formatValue={
                                        isPrescriptive ? undefined : money
                                    }
                                />
                            </div>
                        )}
                    </AdminCard>

                    <AdminCard>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Suggested actions
                                </p>
                                <h3 className="mt-1 font-serif text-xl font-bold tracking-tight">
                                    Price recommendations
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Increases are at least ₱500; no price
                                    changes without confirmation.
                                </p>
                            </div>
                            <span className="font-mono text-xs tabular-nums text-slate-500">
                                {recommendations.length} offers
                            </span>
                        </div>
                        {loading ? (
                            <p
                                role="status"
                                className="py-8 text-sm text-slate-500"
                            >
                                Preparing recommendations…
                            </p>
                        ) : error ? (
                            <p className="py-8 text-sm text-slate-500">
                                Recommendations unavailable.
                            </p>
                        ) : recommendations.length === 0 ? (
                            <p className="py-8 text-sm text-slate-500">
                                No active offers are available to price.
                            </p>
                        ) : (
                            <ul className="mt-3 divide-y divide-[rgba(0,0,0,0.06)]">
                                {recommendations.map((recommendation) => (
                                    <li
                                        key={recommendation.service_id}
                                        className="py-3 first:pt-1"
                                    >
                                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                            <p className="text-sm font-semibold text-slate-900">
                                                {recommendation.name}
                                            </p>
                                            <span
                                                className={`font-mono text-[10px] font-medium uppercase tracking-wide ${
                                                    recommendation.direction ===
                                                    'increase'
                                                        ? 'text-emerald-700'
                                                        : recommendation.direction ===
                                                            'decrease'
                                                          ? 'text-amber-700'
                                                          : 'text-slate-500'
                                                }`}
                                            >
                                                {recommendation.direction ===
                                                'hold'
                                                    ? 'Hold'
                                                    : `${recommendation.change_percent > 0 ? '+' : ''}${recommendation.change_percent}%`}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                            {recommendation.reasons.join(' · ')}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-mono text-xs tabular-nums text-slate-800">
                                                {money(
                                                    recommendation.current_price,
                                                )}
                                                <span className="mx-1.5 text-slate-400">
                                                    →
                                                </span>
                                                <strong>
                                                    {money(
                                                        recommendation.suggested_price,
                                                    )}
                                                </strong>
                                                <span className="ml-2 text-[9px] uppercase tracking-wide text-slate-500">
                                                    {recommendation.confidence}{' '}
                                                    confidence
                                                </span>
                                            </p>
                                            {recommendation.direction ===
                                            'hold' ? (
                                                <span className="text-[10px] text-slate-500">
                                                    No adjustment suggested
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPriceAdjustmentError(
                                                            '',
                                                        )
                                                        setSelectedPriceRecommendation(
                                                            recommendation,
                                                        )
                                                    }}
                                                    className={`inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-[#006dfc] hover:bg-slate-50 ${focusRing}`}
                                                >
                                                    Review adjustment
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
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
                            Conversion
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-tight">
                            Booking funnel
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Visitors → booking starts → paid reservations
                        </p>
                        {loading ? (
                            <p role="status" className="py-8 text-sm text-slate-500">
                                Loading funnel…
                            </p>
                        ) : error ? (
                            <p className="py-8 text-sm text-slate-500">
                                Funnel data unavailable.
                            </p>
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

                <section>
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
            {selectedPriceRecommendation && (
                <ConfirmDialog
                    title={`Adjust ${selectedPriceRecommendation.name} base price?`}
                    description={`Change the base price from ${money(selectedPriceRecommendation.current_price)} to ${money(selectedPriceRecommendation.suggested_price)} (${selectedPriceRecommendation.change_percent > 0 ? '+' : ''}${selectedPriceRecommendation.change_percent}%). This only affects new reservations; existing bookings remain unchanged. The update will not be made unless you confirm.`}
                    confirmLabel="Confirm price update"
                    loadingLabel="Saving price…"
                    confirmVariant="primary"
                    loading={priceAdjustmentLoading}
                    error={priceAdjustmentError}
                    onCancel={closePriceAdjustment}
                    onConfirm={() => void confirmPriceAdjustment()}
                />
            )}
        </main>
    )
}

export default Dashboard
