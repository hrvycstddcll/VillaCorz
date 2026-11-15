import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Download, Mail, RefreshCw, Save, Search, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import {
    exportActivityLogs,
    getActivityLogSummary,
    getActivityLogs,
} from '../../../services/activityLogService'
import {
    exportAdminReport,
    createReportSchedule,
    deleteReportSchedule,
    getAdminReport,
    getReportSchedules,
    markContactMessageRead,
} from '../../../services/dashboardService'
import type {
    ActivityLog,
    ActivityLogCategory,
    ActivityLogQuery,
    ActivityLogSummary,
    AdminReportKind,
    AdminReportRow,
    AdminReportSchedule,
} from '../../../services/types'
import { money } from '../../../lib/format'
import AdminCard from '../admin/AdminCard'
import AdminEmptyState from '../admin/AdminEmptyState'
import AdminFilterPills from '../admin/AdminFilterPills'
import AdminStatStrip from '../admin/AdminStatStrip'
import AdminTable, { type AdminTableColumn } from '../admin/AdminTable'
import AdminPageHeader from '../ui/AdminPageHeader'

const pageSize = 20
const reportOptions: Array<{ value: AdminReportKind | 'activity'; label: string }> = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'bookings', label: 'Bookings' },
    { value: 'cancellations', label: 'Cancellations' },
    { value: 'reviews', label: 'Reviews' },
    { value: 'payments', label: 'Payments' },
    { value: 'contacts', label: 'Contact' },
    { value: 'guests', label: 'Guests' },
    { value: 'traffic', label: 'Traffic' },
    { value: 'activity', label: 'Activity' },
]

type ReportTab = (typeof reportOptions)[number]['value']
type SavedView = { name: string; query: string }
type ReportResult = {
    key: string
    rows: AdminReportRow[]
    total: number
    amount: number
    page: number
    lastPage: number
}

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'
const numberFormatter = new Intl.NumberFormat('en-PH')
const dateFormatter = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeZone: 'Asia/Manila',
})

const parseTab = (value: string | null): ReportTab =>
    reportOptions.some((option) => option.value === value)
        ? (value as ReportTab)
        : 'revenue'

const dateValue = (date: Date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    return localDate.toISOString().slice(0, 10)
}

const statusColor = (status: string) => {
    if (['confirmed', 'completed', 'paid', 'published', 'read'].includes(status)) {
        return 'bg-emerald-500'
    }
    if (['expired', 'cancelled', 'hidden', 'rejected'].includes(status)) {
        return 'bg-rose-500'
    }
    if (['pending', 'unread', 'pending_payment'].includes(status)) {
        return 'bg-amber-500'
    }
    return 'bg-slate-400'
}

const actorName = (log: ActivityLog) =>
    log.user
        ? `${log.user.firstname} ${log.user.lastname}`.trim()
        : log.action === 'login_failed'
          ? 'Unauthenticated'
          : 'System'

const humanize = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

const Reports = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const report = parseTab(searchParams.get('report'))
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const from = searchParams.get('from') ?? ''
    const to = searchParams.get('to') ?? ''
    const dateField =
        searchParams.get('date_field') === 'check_in' ? 'check_in' : undefined
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? ''
    const category = (searchParams.get('category') ?? 'all') as ActivityLogCategory
    const [result, setResult] = useState<ReportResult | null>(null)
    const [activitySummary, setActivitySummary] =
        useState<ActivityLogSummary | null>(null)
    const [activityError, setActivityError] = useState('')
    const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
    const [exportError, setExportError] = useState('')
    const [refreshKey, setRefreshKey] = useState(0)
    const [exporting, setExporting] = useState(false)
    const [expandedRow, setExpandedRow] = useState<number | null>(null)
    const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
        try {
            const value = window.localStorage.getItem('admin-report-views')
            const parsed: unknown = value ? JSON.parse(value) : []
            return Array.isArray(parsed)
                ? parsed.filter(
                      (item): item is SavedView =>
                          typeof item?.name === 'string' &&
                          typeof item?.query === 'string',
                  )
                : []
        } catch {
            return []
        }
    })
    const [viewName, setViewName] = useState('')
    const [showSavedViews, setShowSavedViews] = useState(false)
    const [scheduleOpen, setScheduleOpen] = useState(false)
    const [scheduleEmail, setScheduleEmail] = useState('')
    const [scheduleFrequency, setScheduleFrequency] =
        useState<'weekly' | 'monthly'>('weekly')
    const [scheduleSaving, setScheduleSaving] = useState(false)
    const [scheduleError, setScheduleError] = useState('')
    const [schedules, setSchedules] = useState<AdminReportSchedule[]>([])

    const requestKey = [
        report,
        refreshKey,
        from,
        to,
        search,
        status,
        dateField,
        category,
        page,
    ].join('|')
    const activityQuery = useMemo<ActivityLogQuery>(
        () => ({
            category,
            from: from || undefined,
            to: to || undefined,
            search: search || undefined,
            page,
            per_page: pageSize,
        }),
        [category, from, to, search, page],
    )
    const loading = result?.key !== requestKey && failure?.key !== requestKey
    const error = failure?.key === requestKey ? failure.message : ''
    const rows = result?.key === requestKey ? result.rows : []
    const total = result?.key === requestKey ? result.total : 0
    const totalAmount = result?.key === requestKey ? result.amount : 0
    const lastPage = result?.key === requestKey ? result.lastPage : 1

    useEffect(() => {
        let active = true
        getActivityLogSummary()
            .then((response) => {
                if (active) setActivitySummary(response.data.data)
            })
            .catch(() => {
                if (active) setActivityError('Unable to load activity totals.')
            })

        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        let active = true

        if (report === 'activity') {
            getActivityLogs(activityQuery)
                .then((response) => {
                    if (!active) return
                    setFailure(null)
                    const payload = response.data
                    const normalizedRows: AdminReportRow[] = payload.data.map(
                        (log) => ({
                            id: log.id,
                            reference: `LOG-${log.id}`,
                            date: log.created_at,
                            label: actorName(log),
                            detail: log.description ?? humanize(log.action),
                            status: log.action,
                            amount: null,
                        }),
                    )
                    setResult({
                        key: requestKey,
                        rows: normalizedRows,
                        total: payload.total,
                        amount: 0,
                        page: payload.current_page,
                        lastPage: payload.last_page,
                    })
                })
                .catch(() => {
                    if (active) {
                        setFailure({
                            key: requestKey,
                            message: 'Unable to load the activity ledger.',
                        })
                    }
                })
        } else {
            getAdminReport({
                report,
                from: from || undefined,
                to: to || undefined,
                date_field: dateField,
                search: search || undefined,
                status: status || undefined,
                page,
                per_page: pageSize,
            })
                .then((response) => {
                    if (!active) return
                    setFailure(null)
                    setResult({
                        key: requestKey,
                        rows: response.data.data,
                        total: response.data.meta.total,
                        amount: response.data.summary.amount,
                        page: response.data.meta.current_page,
                        lastPage: response.data.meta.last_page,
                    })
                })
                .catch(() => {
                    if (active) {
                        setFailure({
                            key: requestKey,
                            message: 'Unable to load this report.',
                        })
                    }
                })
        }

        return () => {
            active = false
        }
    }, [activityQuery, dateField, from, page, report, refreshKey, requestKey, search, status, to])

    const updateParams = (updates: Record<string, string | null>) => {
        setExpandedRow(null)
        setExportError('')
        const next = new URLSearchParams(searchParams)
        Object.entries(updates).forEach(([key, value]) => {
            if (value) next.set(key, value)
            else next.delete(key)
        })
        if (!('page' in updates)) next.delete('page')
        setSearchParams(next, { replace: true })
    }

    const handleDatePreset = (days: number) => {
        const today = new Date()
        const first = new Date(today)
        first.setDate(today.getDate() - days + 1)
        updateParams({ from: dateValue(first), to: dateValue(today) })
    }

    const handleExport = async () => {
        if (exporting) return
        setExporting(true)
        setExportError('')
        try {
            const response =
                report === 'activity'
                    ? await exportActivityLogs(activityQuery)
                    : await exportAdminReport({
                          report,
                          from: from || undefined,
                          to: to || undefined,
                          date_field: dateField,
                          search: search || undefined,
                          status: status || undefined,
                      })
            const url = URL.createObjectURL(response.data)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = `villacorz-${report}-${dateValue(new Date())}.csv`
            document.body.appendChild(anchor)
            anchor.click()
            anchor.remove()
            URL.revokeObjectURL(url)
        } catch {
            setExportError('Unable to export this report. Please try again.')
        } finally {
            setExporting(false)
        }
    }

    const handleSaveView = () => {
        const name = viewName.trim()
        if (!name) return
        const next = [
            ...savedViews.filter((view) => view.name !== name),
            { name, query: searchParams.toString() },
        ]
        setSavedViews(next)
        window.localStorage.setItem('admin-report-views', JSON.stringify(next))
        setViewName('')
    }

    const handleMarkRead = async (id: number) => {
        try {
            await markContactMessageRead(id)
            setRefreshKey((current) => current + 1)
        } catch {
            setExportError('Unable to mark the contact message as read.')
        }
    }

    const openSchedules = async () => {
        setScheduleOpen(true)
        setScheduleError('')
        try {
            const response = await getReportSchedules()
            setSchedules(response.data.data)
        } catch {
            setScheduleError('Unable to load scheduled exports.')
        }
    }

    const handleSchedule = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (report === 'activity' || scheduleSaving) return
        setScheduleSaving(true)
        setScheduleError('')
        try {
            const response = await createReportSchedule({
                report,
                email: scheduleEmail,
                frequency: scheduleFrequency,
            })
            setSchedules((current) => [response.data.data, ...current])
            setScheduleEmail('')
        } catch {
            setScheduleError('Unable to schedule this export. Check the email and try again.')
        } finally {
            setScheduleSaving(false)
        }
    }

    const removeSchedule = async (id: number) => {
        try {
            await deleteReportSchedule(id)
            setSchedules((current) => current.filter((schedule) => schedule.id !== id))
        } catch {
            setScheduleError('Unable to cancel this scheduled export.')
        }
    }

    const reportColumns: AdminTableColumn<AdminReportRow>[] = [
        {
            key: 'reference',
            label:
                report === 'guests'
                    ? 'Guest ID'
                    : report === 'traffic'
                      ? 'View ID'
                      : 'Reference',
            render: (row) => (
                <button
                    type="button"
                    onClick={() =>
                        setExpandedRow(expandedRow === row.id ? null : row.id)
                    }
                    aria-expanded={expandedRow === row.id}
                    className={`inline-flex min-h-11 items-center rounded-sm font-mono text-[11px] font-semibold tabular-nums text-[#006dfc] ${focusRing}`}
                >
                    {row.reference}
                </button>
            ),
        },
        {
            key: 'date',
            label: dateField === 'check_in' ? 'Check-in' : 'Date',
            className: 'hidden sm:table-cell',
            render: (row) => (
                <span className="font-mono text-[11px] tabular-nums text-slate-600">
                    {row.date && !Number.isNaN(new Date(row.date).getTime())
                        ? dateFormatter.format(new Date(row.date))
                        : '—'}
                </span>
            ),
        },
        {
            key: 'label',
            label:
                report === 'guests'
                    ? 'Guest'
                    : report === 'traffic'
                      ? 'Page'
                      : 'Name',
            render: (row) => (
                <span className="block max-w-48 truncate text-xs font-medium text-slate-900">
                    {row.label}
                </span>
            ),
        },
        {
            key: 'detail',
            label: report === 'traffic' ? 'Referrer' : 'Details',
            className: 'hidden md:table-cell',
            render: (row) => (
                <span className="block max-w-sm truncate text-xs text-slate-600">
                    {row.detail}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <span className="inline-flex min-h-11 items-center gap-2 text-[11px] text-slate-700">
                    <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${statusColor(row.status)}`}
                    />
                    {humanize(row.status)}
                </span>
            ),
        },
        {
            key: 'amount',
            label:
                report === 'reviews'
                    ? 'Rating'
                    : report === 'traffic'
                      ? 'Views'
                      : 'Amount',
            align: 'right',
            render: (row) => (
                <span className="font-mono text-xs tabular-nums text-slate-800">
                    {report === 'traffic'
                        ? '1'
                        : row.amount === null
                          ? '—'
                        : report === 'reviews'
                          ? `${row.amount}/5`
                          : money(row.amount)}
                </span>
            ),
        },
        ...(report === 'contacts'
            ? [
                  {
                      key: 'action',
                      label: 'Action',
                      align: 'right' as const,
                      render: (row: AdminReportRow) =>
                          row.status === 'unread' ? (
                              <button
                                  type="button"
                                  onClick={() => void handleMarkRead(row.id)}
                                  className={`min-h-11 rounded-sm px-2 text-[10px] font-semibold text-[#006dfc] ${focusRing}`}
                              >
                                  Mark read
                              </button>
                          ) : null,
                  },
              ]
            : []),
    ]

    const statusOptions = [
        ...(report === 'bookings'
            ? ['check_ins', 'pending_payment', 'confirmed', 'expired', 'cancelled']
            : report === 'cancellations'
              ? ['pending', 'approved', 'rejected']
              : report === 'reviews'
                ? ['pending', 'published', 'hidden']
                : report === 'payments'
                  ? ['pending', 'paid', 'expired', 'cancelled']
                  : report === 'contacts'
                    ? ['unread', 'read']
                    : []),
    ].map((value) => ({
        value,
        label: value === 'check_ins' ? 'Check-ins' : humanize(value),
    }))
    const filterStatusOptions = [
        { value: '', label: 'All' },
        ...statusOptions,
    ]

    return (
        <main className="min-h-screen bg-white pb-12 text-slate-900">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <AdminPageHeader
                    eyebrow="Administration / Reports"
                    title="Reports"
                    subtitle="Explore financial activity, stays, requests, guest feedback, and system events."
                    hero={{
                        label: 'Total events',
                        value: activitySummary
                            ? numberFormatter.format(activitySummary.total)
                            : '—',
                        href: '/reports?report=activity',
                    }}
                    action={
                        <button
                            type="button"
                            onClick={() => void handleExport()}
                            disabled={exporting}
                            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#006dfc] px-4 text-xs font-semibold text-white hover:bg-[#0057c9] disabled:opacity-60 ${focusRing}`}
                        >
                            <Download className="size-4" aria-hidden="true" />
                            {exporting ? 'Exporting…' : 'Export CSV'}
                        </button>
                    }
                />

                <div className="flex flex-col gap-4 border-b border-[rgba(0,0,0,0.06)] pb-4">
                    <AdminFilterPills
                        label="Report type"
                        value={report}
                        onChange={(value) =>
                            updateParams({
                                report: value,
                                status: null,
                                category: null,
                                date_field: null,
                            })
                        }
                        options={reportOptions}
                    />
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                        <div className="flex flex-wrap items-end gap-2">
                            <label className="min-w-52">
                                <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Search
                                </span>
                                <span className="relative block">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(event) =>
                                            updateParams({
                                                search: event.target.value || null,
                                            })
                                        }
                                        placeholder={
                                            report === 'guests'
                                                ? 'Name or email'
                                                : report === 'traffic'
                                                  ? 'Page or referrer'
                                                  : 'Reference or name'
                                        }
                                        className={`h-11 w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/20 ${focusRing}`}
                                    />
                                </span>
                            </label>
                            <label>
                                <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {dateField === 'check_in' ? 'Check-in from' : 'From'}
                                </span>
                                <input
                                    type="date"
                                    value={from}
                                    max={to || undefined}
                                    onChange={(event) =>
                                        updateParams({ from: event.target.value || null })
                                    }
                                    className={`h-11 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-3 text-sm tabular-nums outline-none focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/20 ${focusRing}`}
                                />
                            </label>
                            <label>
                                <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {dateField === 'check_in' ? 'Check-in to' : 'To'}
                                </span>
                                <input
                                    type="date"
                                    value={to}
                                    min={from || undefined}
                                    onChange={(event) =>
                                        updateParams({ to: event.target.value || null })
                                    }
                                    className={`h-11 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-3 text-sm tabular-nums outline-none focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/20 ${focusRing}`}
                                />
                            </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {[7, 30, 90].map((days) => (
                                <button
                                    key={days}
                                    type="button"
                                    onClick={() => handleDatePreset(days)}
                                    className={`min-h-11 rounded-lg px-3 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 ${focusRing}`}
                                >
                                    {days} days
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() =>
                                    updateParams({
                                        from: null,
                                        to: null,
                                        search: null,
                                        status: null,
                                        date_field: null,
                                    })
                                }
                                className={`min-h-11 rounded-lg px-3 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 ${focusRing}`}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                    {statusOptions.length > 1 && (
                        <AdminFilterPills
                            label="Filter by status"
                            value={status}
                            onChange={(value) =>
                                updateParams({ status: value || null })
                            }
                            options={filterStatusOptions}
                        />
                    )}
                    {report === 'activity' && (
                        <AdminFilterPills
                            label="Filter activity category"
                            value={category}
                            onChange={(value) =>
                                updateParams({
                                    category: value === 'all' ? null : value,
                                })
                            }
                            options={[
                                { value: 'all', label: 'All events' },
                                { value: 'changes', label: 'Changes' },
                                { value: 'access', label: 'Access' },
                            ]}
                        />
                    )}
                </div>

                <AdminStatStrip
                    stats={[
                        {
                            label: 'Matching rows',
                            value: loading ? '—' : numberFormatter.format(total),
                            href: `/reports?${searchParams.toString()}`,
                        },
                        ...(report === 'revenue' || report === 'payments' || report === 'bookings'
                            ? [
                                  {
                                      label: report === 'bookings' ? 'Booking value' : 'Amount',
                                      value: loading ? '—' : money(totalAmount),
                                      href: `/reports?${searchParams.toString()}`,
                                  },
                              ]
                            : []),
                        ...(report === 'activity' && activitySummary
                            ? [
                                  {
                                      label: 'Recorded today',
                                      value: numberFormatter.format(activitySummary.today),
                                  },
                              ]
                            : []),
                    ]}
                />

                {(error || activityError) && (
                    <p role="alert" className="text-sm text-rose-700">
                        {error || exportError || activityError}
                    </p>
                )}

                <AdminCard padding={false}>
                    <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-3 pt-5">
                        <div>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {report === 'activity' ? 'Audit trail' : 'Filtered ledger'}
                            </p>
                            <h2 className="mt-1 font-serif text-xl font-bold tracking-tight">
                                {reportOptions.find((option) => option.value === report)?.label} ledger
                            </h2>
                        </div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                            {loading ? 'Loading' : `${numberFormatter.format(total)} rows`}
                        </p>
                    </div>
                    <div className="px-5 pb-2">
                        {loading ? (
                            <p role="status" className="py-10 text-center text-sm text-slate-500">
                                Loading report rows…
                            </p>
                        ) : error ? (
                            <div className="flex flex-col items-center gap-3 py-10 text-center">
                                <p className="text-sm text-slate-600">
                                    Report rows could not be loaded.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setRefreshKey((current) => current + 1)}
                                    className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold hover:bg-slate-100 ${focusRing}`}
                                >
                                    <RefreshCw className="size-4" aria-hidden="true" />
                                    Retry
                                </button>
                            </div>
                        ) : rows.length === 0 ? (
                            <AdminEmptyState
                                icon={RefreshCw}
                                heading="No matching records"
                                subtitle="Change the date range or filters to see more entries."
                                ctaLabel="Clear filters"
                                onAction={() =>
                                    updateParams({
                                        from: null,
                                        to: null,
                                        search: null,
                                        status: null,
                                    })
                                }
                            />
                        ) : (
                            <>
                                <AdminTable
                                    label={`${report} report ledger`}
                                    columns={reportColumns}
                                    rows={rows}
                                    rowKey={(row) => row.id}
                                    empty={null}
                                />
                                {expandedRow !== null && (
                                    <div className="my-4 rounded-xl border border-[rgba(0,0,0,0.06)] p-4">
                                        {rows
                                            .filter((row) => row.id === expandedRow)
                                            .map((row) => (
                                                <dl
                                                    key={row.id}
                                                    className="grid gap-3 sm:grid-cols-2"
                                                >
                                                    <div>
                                                        <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                            Reference
                                                        </dt>
                                                        <dd className="mt-1 font-mono text-xs tabular-nums">
                                                            {row.reference}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                            Date
                                                        </dt>
                                                        <dd className="mt-1 font-mono text-xs tabular-nums">
                                                            {row.date
                                                                ? dateFormatter.format(new Date(row.date))
                                                                : '—'}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                            {report === 'contacts' ? 'Message' : 'Details'}
                                                        </dt>
                                                        <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                            {row.detail || '—'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(0,0,0,0.06)] px-5 py-3">
                        <span className="text-[11px] text-slate-500">
                            Page <span className="font-mono tabular-nums">{result?.page ?? page}</span> of{' '}
                            <span className="font-mono tabular-nums">{lastPage}</span>
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={page <= 1 || loading}
                                onClick={() => updateParams({ page: String(page - 1) })}
                                className={`min-h-11 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-xs font-semibold disabled:opacity-40 ${focusRing}`}
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                disabled={page >= lastPage || loading}
                                onClick={() => updateParams({ page: String(page + 1) })}
                                className={`min-h-11 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-xs font-semibold disabled:opacity-40 ${focusRing}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </AdminCard>

                <AdminCard>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Saved views
                            </p>
                            <h2 className="mt-1 font-serif text-lg font-bold">
                                Reuse a filter set
                            </h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <label>
                                <span className="sr-only">Saved view name</span>
                                <input
                                    value={viewName}
                                    onChange={(event) => setViewName(event.target.value)}
                                    placeholder="Name this view"
                                    className={`h-11 rounded-lg border border-[rgba(0,0,0,0.1)] px-3 text-sm ${focusRing}`}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={handleSaveView}
                                disabled={!viewName.trim()}
                                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-xs font-semibold disabled:opacity-40 ${focusRing}`}
                            >
                                <Save className="size-4" aria-hidden="true" />
                                Save view
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowSavedViews((current) => !current)}
                                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-xs font-semibold ${focusRing}`}
                            >
                                {showSavedViews ? 'Hide views' : 'Saved views'}
                            </button>
                            {report !== 'activity' && (
                                <button
                                    type="button"
                                    onClick={() => void openSchedules()}
                                    className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-xs font-semibold ${focusRing}`}
                                >
                                    <Mail className="size-4" aria-hidden="true" />
                                    Schedule email
                                </button>
                            )}
                        </div>
                    </div>
                    {showSavedViews && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {savedViews.length === 0 ? (
                                <li className="text-xs text-slate-500">No saved views on this device.</li>
                            ) : (
                                savedViews.map((view) => (
                                    <li key={view.name}>
                                        <button
                                            type="button"
                                            onClick={() => setSearchParams(new URLSearchParams(view.query))}
                                            className={`min-h-11 rounded-lg bg-slate-100 px-3 text-xs font-semibold hover:bg-slate-200 ${focusRing}`}
                                        >
                                            {view.name}
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>
                    )}
                </AdminCard>
            </div>
            {scheduleOpen && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setScheduleOpen(false)
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="schedule-report-title"
                        className="w-full max-w-lg rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-[0_12px_36px_rgba(0,0,0,0.12)]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Scheduled export
                                </p>
                                <h2 id="schedule-report-title" className="mt-1 font-serif text-xl font-bold">
                                    Email {humanize(report)} report
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setScheduleOpen(false)}
                                aria-label="Close scheduled report dialog"
                                className={`inline-grid size-11 place-items-center rounded-lg hover:bg-slate-100 ${focusRing}`}
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                        <form onSubmit={(event) => void handleSchedule(event)} className="mt-4">
                            <label className="block">
                                <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Email address
                                </span>
                                <input
                                    type="email"
                                    required
                                    maxLength={254}
                                    value={scheduleEmail}
                                    onChange={(event) => setScheduleEmail(event.target.value)}
                                    className={`h-11 w-full rounded-lg border border-[rgba(0,0,0,0.1)] px-3 text-sm outline-none focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/20 ${focusRing}`}
                                />
                            </label>
                            <label className="mt-3 block">
                                <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Frequency
                                </span>
                                <select
                                    value={scheduleFrequency}
                                    onChange={(event) =>
                                        setScheduleFrequency(event.target.value as 'weekly' | 'monthly')
                                    }
                                    className={`h-11 w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-3 text-sm ${focusRing}`}
                                >
                                    <option value="weekly">Weekly · last 7 days</option>
                                    <option value="monthly">Monthly · last 30 days</option>
                                </select>
                            </label>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                CSV exports are sent at 8:00 AM on the next scheduled run. The server scheduler must be active.
                            </p>
                            {scheduleError && (
                                <p role="alert" className="mt-3 text-xs text-rose-700">
                                    {scheduleError}
                                </p>
                            )}
                            <div className="mt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={scheduleSaving}
                                    className={`min-h-11 rounded-xl bg-[#006dfc] px-4 text-xs font-semibold text-white hover:bg-[#0057c9] disabled:opacity-50 ${focusRing}`}
                                >
                                    {scheduleSaving ? 'Scheduling…' : 'Schedule export'}
                                </button>
                            </div>
                        </form>
                        <div className="mt-5 border-t border-[rgba(0,0,0,0.06)] pt-4">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Active schedules
                            </p>
                            {schedules.length === 0 ? (
                                <p className="mt-2 text-xs text-slate-500">
                                    No scheduled reports yet.
                                </p>
                            ) : (
                                <ul className="mt-2 divide-y divide-[rgba(0,0,0,0.06)]">
                                    {schedules.map((schedule) => (
                                        <li key={schedule.id} className="flex min-h-12 items-center gap-3 py-2">
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-xs font-medium">
                                                    {humanize(schedule.report)} · {schedule.frequency}
                                                </span>
                                                <span className="block truncate text-[10px] text-slate-500">
                                                    {schedule.email}
                                                </span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => void removeSchedule(schedule.id)}
                                                className={`min-h-11 rounded-lg px-2 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 ${focusRing}`}
                                            >
                                                Cancel
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </main>
    )
}

export default Reports
