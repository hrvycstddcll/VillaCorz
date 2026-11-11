import { Fragment, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
    AlertCircle,
    ChevronDown,
    Download,
    RefreshCw,
} from 'lucide-react'
import type {
    ActivityLog,
    ActivityLogCategory,
    ActivityLogQuery,
    ActivityLogSummary,
} from '../../../services/types'
import {
    exportActivityLogs,
    getActivityLogs,
    getActivityLogSummary,
} from '../../../services/activityLogService'

const PAGE_SIZE = 20

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const fieldRing =
    'focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/25'

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
})

const numberFormatter = new Intl.NumberFormat('en-PH')

const categories: { value: ActivityLogCategory; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'changes', label: 'Changes' },
    { value: 'access', label: 'Access' },
]

const actionMeta: Record<
    string,
    { label: string; tone: string; dot: string }
> = {
    created: {
        label: 'Created',
        tone: 'text-emerald-700',
        dot: 'bg-emerald-500',
    },
    updated: {
        label: 'Updated',
        tone: 'text-amber-700',
        dot: 'bg-amber-500',
    },
    deleted: {
        label: 'Deleted',
        tone: 'text-rose-700',
        dot: 'bg-rose-500',
    },
    login: {
        label: 'Sign-in',
        tone: 'text-[#0057c9]',
        dot: 'bg-[#006dfc]',
    },
    logout: {
        label: 'Sign-out',
        tone: 'text-slate-600',
        dot: 'bg-slate-400',
    },
    login_failed: {
        label: 'Failed sign-in',
        tone: 'text-rose-700',
        dot: 'bg-rose-500',
    },
    registered: {
        label: 'Registered',
        tone: 'text-teal-700',
        dot: 'bg-teal-500',
    },
}

const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
            return 'Your session has expired. Please sign in again.'
        }

        if (error.response?.status === 403) {
            return 'You do not have permission to view activity logs.'
        }

        const data = error.response?.data as { message?: string } | undefined

        if (data?.message) {
            return data.message
        }
    }

    return 'Unable to load activity logs. Please try again.'
}

const humanize = (value: string) =>
    value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())

const actorName = (log: ActivityLog) => {
    if (!log.user) {
        return log.action === 'login_failed' ? 'Unauthenticated' : 'System'
    }

    return `${log.user.firstname} ${log.user.lastname}`.trim() || 'Unnamed user'
}

const actorEmail = (log: ActivityLog) => {
    if (log.user) return log.user.email

    const attempted = log.properties?.email

    return typeof attempted === 'string' && attempted !== ''
        ? attempted
        : 'Automated system process'
}

const actorInitials = (log: ActivityLog) => {
    if (!log.user) {
        return log.action === 'login_failed' ? '—' : 'SYS'
    }

    const initials = `${log.user.firstname.charAt(0)}${log.user.lastname.charAt(0)}`
        .trim()
        .toUpperCase()

    return initials || 'USR'
}

const formatStamp = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return { date: '—', time: '—' }
    }

    return {
        date: dateFormatter.format(date),
        time: timeFormatter.format(date),
    }
}

const formatPropertyValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') {
        return '—'
    }

    if (Array.isArray(value)) {
        return value.length > 0 ? value.map(String).join(', ') : '—'
    }

    if (typeof value === 'object') {
        return JSON.stringify(value)
    }

    return String(value)
}

const ReportStat = ({ label, value }: { label: string; value: string }) => (
    <div className="flex h-full flex-col justify-between gap-1 bg-[#003079] px-4 py-3.5">
        <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-blue-200">
            {label}
        </dt>
        <dd className="font-mono text-xl font-normal tabular-nums text-white sm:text-2xl">
            {value}
        </dd>
    </div>
)

const DetailItem = ({
    label,
    value,
    mono = false,
    className = '',
}: {
    label: string
    value: string
    mono?: boolean
    className?: string
}) => (
    <div className={`min-w-0 ${className}`}>
        <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
            {label}
        </dt>
        <dd
            className={`mt-1 break-words text-[13px] leading-5 text-slate-700 ${
                mono ? 'font-mono tabular-nums' : ''
            }`}
        >
            {value}
        </dd>
    </div>
)

type LogMeta = {
    total: number
    currentPage: number
    lastPage: number
    from: number | null
    to: number | null
}

type LogResult = {
    key: string
    logs: ActivityLog[]
    meta: LogMeta
}

const emptyMeta: LogMeta = {
    total: 0,
    currentPage: 1,
    lastPage: 1,
    from: null,
    to: null,
}

const Reports = () => {
    const [summary, setSummary] = useState<ActivityLogSummary | null>(null)
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState('')
    const [page, setPage] = useState(1)
    const [refreshKey, setRefreshKey] = useState(0)
    const [expandedId, setExpandedId] = useState<number | null>(null)
    const [searchInput, setSearchInput] = useState('')
    const [filters, setFilters] = useState<{
        category: ActivityLogCategory
        search: string
        from: string
        to: string
    }>({
        category: 'all',
        search: '',
        from: '',
        to: '',
    })
    const [result, setResult] = useState<LogResult | null>(null)
    const [failure, setFailure] = useState<{
        key: string
        message: string
    } | null>(null)

    const hasFilters =
        filters.category !== 'all' ||
        Boolean(filters.search) ||
        Boolean(filters.from) ||
        Boolean(filters.to)

    const queryParams = useMemo<ActivityLogQuery>(
        () => ({
            category:
                filters.category === 'all' ? undefined : filters.category,
            search: filters.search || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
        }),
        [filters],
    )

    const requestKey = [
        filters.category,
        filters.search,
        filters.from,
        filters.to,
        page,
        refreshKey,
    ].join('|')

    const loading = result?.key !== requestKey && failure?.key !== requestKey
    const loadError = failure?.key === requestKey ? failure.message : ''
    const logs = result?.key === requestKey ? result.logs : []
    const meta = result?.meta ?? emptyMeta

    useEffect(() => {
        const nextSearch = searchInput.trim()

        if (nextSearch === filters.search) return

        const timeout = window.setTimeout(() => {
            setFilters((current) => ({ ...current, search: nextSearch }))
            setPage(1)
        }, 350)

        return () => window.clearTimeout(timeout)
    }, [searchInput, filters.search])

    useEffect(() => {
        let active = true

        getActivityLogSummary()
            .then((response) => {
                if (active) {
                    setSummary(response.data.data)
                }
            })
            .catch(() => {
                // The ledger remains usable even if the summary cannot load.
            })

        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        let active = true

        getActivityLogs({ ...queryParams, page, per_page: PAGE_SIZE })
            .then((response) => {
                if (!active) return

                const payload = response.data

                setResult({
                    key: requestKey,
                    logs: Array.isArray(payload.data) ? payload.data : [],
                    meta: {
                        total: payload.total ?? 0,
                        currentPage: payload.current_page ?? 1,
                        lastPage: payload.last_page ?? 1,
                        from: payload.from ?? null,
                        to: payload.to ?? null,
                    },
                })
                setExpandedId(null)
            })
            .catch((requestError) => {
                if (active) {
                    setFailure({
                        key: requestKey,
                        message: getErrorMessage(requestError),
                    })
                }
            })

        return () => {
            active = false
        }
    }, [queryParams, page, refreshKey, requestKey])

    const clearFilters = () => {
        setSearchInput('')
        setFilters({ category: 'all', search: '', from: '', to: '' })
        setPage(1)
    }

    const handleExport = async () => {
        if (exporting) return

        setExporting(true)
        setExportError('')

        try {
            const response = await exportActivityLogs(queryParams)
            const blob = new Blob([response.data], {
                type: 'text/csv;charset=utf-8;',
            })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')

            link.href = url
            link.download = `villacorz-activity-log-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(url)
        } catch (exportFailure) {
            setExportError(getErrorMessage(exportFailure))
        } finally {
            setExporting(false)
        }
    }

    const stats = [
        {
            label: 'Total events',
            value: summary ? numberFormatter.format(summary.total) : '—',
        },
        {
            label: 'System changes',
            value: summary ? numberFormatter.format(summary.changes) : '—',
        },
        {
            label: 'Access events',
            value: summary ? numberFormatter.format(summary.access) : '—',
        },
        {
            label: 'Recorded today',
            value: summary ? numberFormatter.format(summary.today) : '—',
        },
    ]

    return (
        <main className="min-h-[calc(100dvh-var(--navbar-height,3.5rem))] bg-slate-50 pb-16">
            <header className="border-b border-[#00245c] bg-[#003079] text-white">
                <div className="mx-auto w-full max-w-7xl px-4 pb-7 pt-8 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-blue-200">
                                Administration / Reports
                            </p>
                            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                                Activity log
                            </h1>
                            <p className="mt-2 max-w-xl text-pretty text-sm leading-6 text-blue-100">
                                A chronological record of catalogue changes and
                                console access. Entries are written
                                automatically and cannot be edited.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => void handleExport()}
                            disabled={exporting}
                            className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-white/30 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-[background-color,border-color,opacity] duration-150 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60 sm:self-auto motion-reduce:transition-none ${focusRing}`}
                        >
                            <Download
                                className="size-4"
                                aria-hidden="true"
                            />
                            {exporting ? 'Preparing…' : 'Export CSV'}
                        </button>
                    </div>

                    <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/15 bg-white/15 sm:grid-cols-4">
                        {stats.map((stat) => (
                            <ReportStat
                                key={stat.label}
                                label={stat.label}
                                value={stat.value}
                            />
                        ))}
                    </dl>
                </div>
            </header>

            <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
                {exportError && (
                    <div
                        role="alert"
                        className="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="flex items-start gap-3">
                            <AlertCircle
                                className="mt-0.5 size-4 shrink-0"
                                aria-hidden="true"
                            />
                            <p className="leading-5">{exportError}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setExportError('')
                                void handleExport()
                            }}
                            className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition-[background-color,border-color] duration-150 hover:bg-rose-100 motion-reduce:transition-none ${focusRing}`}
                        >
                            <RefreshCw
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            Try again
                        </button>
                    </div>
                )}

                <section
                    aria-labelledby="ledger-heading"
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                    <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div
                                role="group"
                                aria-label="Filter by event category"
                                className="inline-flex w-fit max-w-full flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-1"
                            >
                                {categories.map((category) => {
                                    const isCurrent =
                                        filters.category === category.value

                                    return (
                                        <button
                                            key={category.value}
                                            type="button"
                                            aria-pressed={isCurrent}
                                            onClick={() => {
                                                setFilters((current) => ({
                                                    ...current,
                                                    category: category.value,
                                                }))
                                                setPage(1)
                                            }}
                                            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition-[background-color,color,box-shadow] duration-150 motion-reduce:transition-none ${focusRing} ${
                                                isCurrent
                                                    ? 'bg-[#003079] text-white shadow-sm'
                                                    : 'text-slate-600 hover:text-[#003079]'
                                            }`}
                                        >
                                            {category.label}
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="grid w-full gap-3 sm:grid-cols-2 md:grid-cols-[minmax(10rem,1fr)_8.5rem_8.5rem_auto] md:items-end lg:w-auto">
                                <label className="min-w-0 sm:col-span-2 md:col-span-1">
                                    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                                        Search
                                    </span>
                                    <input
                                        type="search"
                                        value={searchInput}
                                        onChange={(event) =>
                                            setSearchInput(event.target.value)
                                        }
                                        placeholder="Actor, description, IP…"
                                        className={`h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-800 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 sm:text-sm motion-reduce:transition-none ${fieldRing}`}
                                    />
                                </label>

                                <label>
                                    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                                        From
                                    </span>
                                    <input
                                        type="date"
                                        value={filters.from}
                                        max={filters.to || undefined}
                                        onChange={(event) => {
                                            setFilters((current) => ({
                                                ...current,
                                                from: event.target.value,
                                            }))
                                            setPage(1)
                                        }}
                                        className={`h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-800 outline-none transition-[border-color,box-shadow] duration-150 sm:text-sm motion-reduce:transition-none ${fieldRing}`}
                                    />
                                </label>

                                <label>
                                    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                                        To
                                    </span>
                                    <input
                                        type="date"
                                        value={filters.to}
                                        min={filters.from || undefined}
                                        onChange={(event) => {
                                            setFilters((current) => ({
                                                ...current,
                                                to: event.target.value,
                                            }))
                                            setPage(1)
                                        }}
                                        className={`h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-800 outline-none transition-[border-color,box-shadow] duration-150 sm:text-sm motion-reduce:transition-none ${fieldRing}`}
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    disabled={!hasFilters}
                                    className={`inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 transition-[background-color,border-color,color] duration-150 hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 sm:col-span-2 md:col-span-1 motion-reduce:transition-none ${focusRing}`}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-6">
                        <div>
                            <h2
                                id="ledger-heading"
                                className="font-serif text-lg font-semibold text-[#003079]"
                            >
                                Event ledger
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Newest entry first.
                            </p>
                        </div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
                            {loading
                                ? 'Loading'
                                : `${numberFormatter.format(meta.total)} ${
                                      meta.total === 1 ? 'entry' : 'entries'
                                  }`}
                        </p>
                    </div>

                    <p role="status" className="sr-only">
                        {loading
                            ? 'Loading activity log entries…'
                            : `${meta.total} activity log entries loaded.`}
                    </p>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <caption className="sr-only">
                                Activity log entries, newest first.
                            </caption>
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                                    <th
                                        scope="col"
                                        className="w-32 px-4 py-3 font-medium sm:px-6"
                                    >
                                        Time
                                    </th>
                                    <th
                                        scope="col"
                                        className="hidden w-44 px-4 py-3 font-medium md:table-cell"
                                    >
                                        Actor
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-4 py-3 font-medium"
                                    >
                                        Event
                                    </th>
                                    <th
                                        scope="col"
                                        className="hidden w-32 px-4 py-3 font-medium lg:table-cell"
                                    >
                                        Record
                                    </th>
                                    <th
                                        scope="col"
                                        className="hidden w-32 px-4 py-3 font-medium xl:table-cell"
                                    >
                                        IP address
                                    </th>
                                    <th
                                        scope="col"
                                        className="w-14 px-4 py-3 text-right font-medium sm:px-6"
                                    >
                                        <span className="sr-only">Details</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [0, 1, 2, 3, 4].map((row) => (
                                        <tr
                                            key={row}
                                            className="border-b border-slate-100 last:border-0"
                                        >
                                            <td className="px-4 py-4 sm:px-6">
                                                <span className="block h-2.5 w-16 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                                                <span className="mt-2 block h-2.5 w-12 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                                            </td>
                                            <td className="hidden px-4 py-4 md:table-cell">
                                                <span className="block h-2.5 w-28 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                                                <span className="mt-2 block h-2.5 w-36 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="block h-2.5 w-20 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                                                <span className="mt-2 block h-2.5 w-40 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none sm:w-48" />
                                            </td>
                                            <td className="hidden px-4 py-4 lg:table-cell">
                                                <span className="block h-2.5 w-24 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                                            </td>
                                            <td className="hidden px-4 py-4 xl:table-cell">
                                                <span className="block h-2.5 w-20 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
                                            </td>
                                            <td className="px-4 py-4 sm:px-6">
                                                <span className="ml-auto block size-8 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" />
                                            </td>
                                        </tr>
                                    ))
                                ) : loadError ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-16 text-center"
                                        >
                                            <p
                                                role="alert"
                                                className="font-serif text-xl font-semibold text-[#003079]"
                                            >
                                                Ledger unavailable
                                            </p>
                                            <p className="mx-auto mt-1 max-w-sm text-pretty text-sm leading-6 text-slate-500">
                                                {loadError}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setRefreshKey(
                                                        (current) =>
                                                            current + 1,
                                                    )
                                                }
                                                className={`mt-4 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-[background-color,border-color,color] duration-150 hover:border-slate-300 hover:text-[#003079] motion-reduce:transition-none ${focusRing}`}
                                            >
                                                <RefreshCw
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                Try again
                                            </button>
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-6 py-16 text-center"
                                        >
                                            <p className="font-serif text-xl font-semibold text-[#003079]">
                                                No matching entries
                                            </p>
                                            <p className="mx-auto mt-1 max-w-sm text-pretty text-sm leading-6 text-slate-500">
                                                {hasFilters
                                                    ? 'Adjust the category, search, or date range to widen the record.'
                                                    : 'New catalogue changes and sign-in events will appear here as they are recorded.'}
                                            </p>
                                            {hasFilters && (
                                                <button
                                                    type="button"
                                                    onClick={clearFilters}
                                                    className={`mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-[background-color,border-color,color] duration-150 hover:border-slate-300 hover:text-[#003079] motion-reduce:transition-none ${focusRing}`}
                                                >
                                                    Clear filters
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => {
                                        const action =
                                            actionMeta[log.action] ?? {
                                                label: humanize(log.action),
                                                tone: 'text-slate-600',
                                                dot: 'bg-slate-400',
                                            }
                                        const stamp = formatStamp(log.created_at)
                                        const isExpanded =
                                            expandedId === log.id
                                        const properties = Object.entries(
                                            log.properties ?? {},
                                        )
                                        const record = log.subject_label
                                            ? `${log.subject_label}${
                                                  log.subject_id !== null
                                                      ? ` #${log.subject_id}`
                                                      : ''
                                              }`
                                            : '—'

                                        return (
                                            <Fragment key={log.id}>
                                                <tr className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50/70">
                                                    <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                                                        <span className="block font-mono text-[12px] tabular-nums text-slate-500">
                                                            {stamp.date}
                                                        </span>
                                                        <span className="mt-0.5 block font-mono text-[13px] font-medium tabular-nums text-slate-700">
                                                            {stamp.time}
                                                        </span>
                                                    </td>

                                                    <td className="hidden px-4 py-4 md:table-cell">
                                                        <div className="flex items-start gap-2.5">
                                                            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 font-mono text-[10px] font-semibold text-slate-600">
                                                                {actorInitials(
                                                                    log,
                                                                )}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-[13px] font-medium text-slate-900">
                                                                    {actorName(
                                                                        log,
                                                                    )}
                                                                </p>
                                                                <p className="truncate text-[12px] text-slate-500">
                                                                    {actorEmail(
                                                                        log,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <div className="flex items-start gap-2.5">
                                                            <span
                                                                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${action.dot}`}
                                                                aria-hidden="true"
                                                            />
                                                            <div className="min-w-0">
                                                                <span
                                                                    className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${action.tone}`}
                                                                >
                                                                    {
                                                                        action.label
                                                                    }
                                                                </span>
                                                                <p className="mt-1 max-w-md text-pretty text-[13px] leading-5 text-slate-600">
                                                                    {log.description ??
                                                                        '—'}
                                                                </p>
                                                                <p className="mt-1 text-[12px] text-slate-500 md:hidden">
                                                                    {actorName(
                                                                        log,
                                                                    )}
                                                                    {log.subject_label
                                                                        ? ` · ${record}`
                                                                        : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="hidden px-4 py-4 lg:table-cell">
                                                        <p className="text-[13px] text-slate-700">
                                                            {log.subject_label ??
                                                                '—'}
                                                        </p>
                                                        <p className="mt-0.5 font-mono text-[12px] tabular-nums text-slate-500">
                                                            {log.subject_id !==
                                                            null
                                                                ? `#${log.subject_id}`
                                                                : '—'}
                                                        </p>
                                                    </td>

                                                    <td className="hidden px-4 py-4 xl:table-cell">
                                                        <p className="font-mono text-[12px] tabular-nums text-slate-600">
                                                            {log.ip_address ??
                                                                '—'}
                                                        </p>
                                                    </td>

                                                    <td className="px-4 py-4 text-right sm:px-6">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setExpandedId(
                                                                    isExpanded
                                                                        ? null
                                                                        : log.id,
                                                                )
                                                            }
                                                            aria-expanded={
                                                                isExpanded
                                                            }
                                                            aria-controls={`log-details-${log.id}`}
                                                            aria-label={
                                                                isExpanded
                                                                    ? `Hide details for event ${log.id}`
                                                                    : `Show details for event ${log.id}`
                                                            }
                                                            className={`inline-grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-[background-color,border-color,color] duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-[#003079] motion-reduce:transition-none ${focusRing}`}
                                                        >
                                                            <ChevronDown
                                                                className={`size-4 transition-transform duration-150 motion-reduce:transition-none ${
                                                                    isExpanded
                                                                        ? 'rotate-180'
                                                                        : ''
                                                                }`}
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    </td>
                                                </tr>

                                                {isExpanded && (
                                                    <tr
                                                        id={`log-details-${log.id}`}
                                                        className="border-b border-slate-100 bg-slate-50/70 last:border-0"
                                                    >
                                                        <td
                                                            colSpan={6}
                                                            className="px-4 py-4 sm:px-6"
                                                        >
                                                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                                                                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                                                                    <DetailItem
                                                                        label="Event ID"
                                                                        value={`#${log.id}`}
                                                                        mono
                                                                    />
                                                                    <DetailItem
                                                                        label="Record"
                                                                        value={
                                                                            record
                                                                        }
                                                                    />
                                                                    <DetailItem
                                                                        label="Recorded by"
                                                                        value={`${actorName(
                                                                            log,
                                                                        )} · ${actorEmail(
                                                                            log,
                                                                        )}`}
                                                                        className="sm:col-span-2"
                                                                    />
                                                                    <DetailItem
                                                                        label="IP address"
                                                                        value={
                                                                            log.ip_address ??
                                                                            '—'
                                                                        }
                                                                        mono
                                                                    />
                                                                    <DetailItem
                                                                        label="User agent"
                                                                        value={
                                                                            log.user_agent ??
                                                                            'Not recorded'
                                                                        }
                                                                    />
                                                                </dl>

                                                                <div className="min-w-0">
                                                                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                                                                        Recorded
                                                                        fields
                                                                    </p>
                                                                    {properties.length >
                                                                    0 ? (
                                                                        <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                                                                            {properties.map(
                                                                                ([
                                                                                    key,
                                                                                    value,
                                                                                ]) => (
                                                                                    <DetailItem
                                                                                        key={
                                                                                            key
                                                                                        }
                                                                                        label={humanize(
                                                                                            key,
                                                                                        )}
                                                                                        value={formatPropertyValue(
                                                                                            value,
                                                                                        )}
                                                                                    />
                                                                                ),
                                                                            )}
                                                                        </dl>
                                                                    ) : (
                                                                        <p className="mt-1 text-[13px] leading-5 text-slate-500">
                                                                            No
                                                                            additional
                                                                            fields
                                                                            recorded.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <p className="text-xs text-slate-500">
                            {loading
                                ? 'Loading entries…'
                                : meta.total === 0
                                  ? 'No entries to display'
                                  : `Showing ${numberFormatter.format(
                                        meta.from ?? 0,
                                    )}–${numberFormatter.format(
                                        meta.to ?? 0,
                                    )} of ${numberFormatter.format(meta.total)}`}
                        </p>

                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
                                Page {meta.currentPage} / {meta.lastPage}
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    setPage((current) =>
                                        Math.max(1, current - 1),
                                    )
                                }
                                disabled={meta.currentPage <= 1 || loading}
                                className={`inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-[background-color,border-color,color] duration-150 hover:border-slate-300 hover:text-[#003079] disabled:cursor-not-allowed disabled:text-slate-400 motion-reduce:transition-none ${focusRing}`}
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setPage((current) =>
                                        Math.min(meta.lastPage, current + 1),
                                    )
                                }
                                disabled={
                                    meta.currentPage >= meta.lastPage || loading
                                }
                                className={`inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-[background-color,border-color,color] duration-150 hover:border-slate-300 hover:text-[#003079] disabled:cursor-not-allowed disabled:text-slate-400 motion-reduce:transition-none ${focusRing}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}

export default Reports
