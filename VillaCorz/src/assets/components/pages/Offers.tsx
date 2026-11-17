import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
    CalendarDays,
    CircleAlert,
    Plus,
    RefreshCw,
    Search,
    X,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { money } from '../../../lib/format'
import type { Service } from '../../../services/types'
import { getDashboard } from '../../../services/dashboardService'
import {
    deleteService,
    getServices,
    updateServiceStatus,
} from '../../../services/serviceService'
import type { DashboardSummary } from '../../../services/types'
import AdminCard from '../admin/AdminCard'
import AdminEmptyState from '../admin/AdminEmptyState'
import AdminFilterPills from '../admin/AdminFilterPills'
import AdminStatStrip from '../admin/AdminStatStrip'
import AdminTable, { type AdminTableColumn } from '../admin/AdminTable'
import { WarmTooltip } from '../ui/WarmTooltip'
import AdminPageHeader from '../ui/AdminPageHeader'
import ConfirmDialog from '../offers/ConfirmDialog'
import OfferFormModal from '../offers/OfferFormModal'

type OfferFilter = 'all' | 'active' | 'inactive' | 'promotion'
type OfferSort = 'name' | 'bookings' | 'revenue' | 'rating'
type Notice = { tone: 'success' | 'error'; message: string }

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'
const numberFormatter = new Intl.NumberFormat('en-PH')
const localDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const filters: Array<{ value: OfferFilter; label: string }> = [
    { value: 'all', label: 'All offers' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Archived' },
    { value: 'promotion', label: 'On promotion' },
]
const sortOptions: Array<{ value: OfferSort; label: string }> = [
    { value: 'name', label: 'Name' },
    { value: 'bookings', label: '30-day bookings' },
    { value: 'revenue', label: '30-day revenue' },
    { value: 'rating', label: 'Rating' },
]

const getErrorMessage = (
    error: unknown,
    fallback = 'Unable to load offers. Please try again.',
) => {
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) return 'Your session has expired. Please sign in again.'
        if (error.response?.status === 403) return 'You do not have permission to manage offers.'
        const data = error.response?.data as { message?: string } | undefined
        if (data?.message) return data.message
    }

    return fallback
}

const serviceMetrics = (summary: DashboardSummary | null, service: Service) =>
    summary?.offer_metrics.find((metric) => metric.service_id === service.id)

const Offers = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const filter = (filters.some((item) => item.value === searchParams.get('status'))
        ? searchParams.get('status')
        : 'all') as OfferFilter
    const sort = (sortOptions.some((item) => item.value === searchParams.get('sort'))
        ? searchParams.get('sort')
        : 'name') as OfferSort
    const search = searchParams.get('search') ?? ''
    const [services, setServices] = useState<Service[]>([])
    const [summary, setSummary] = useState<DashboardSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState<Notice | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [editingService, setEditingService] = useState<Service | null>(null)
    const [deletingService, setDeletingService] = useState<Service | null>(null)
    const [deleteError, setDeleteError] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [selectedCalendar, setSelectedCalendar] = useState<Service | null>(null)
    const [bulkUpdating, setBulkUpdating] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const [serviceResponse, dashboardResponse] = await Promise.all([
                getServices(),
                getDashboard(30),
            ])
            setServices(serviceResponse.data.data ?? [])
            setSummary(dashboardResponse.data.data)
        } catch (loadFailure) {
            setError(getErrorMessage(loadFailure))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void Promise.resolve().then(loadData)
    }, [loadData])

    useEffect(() => {
        if (!notice) return
        const timeout = window.setTimeout(() => setNotice(null), 5000)
        return () => window.clearTimeout(timeout)
    }, [notice])

    const updateParams = (updates: Record<string, string | null>) => {
        const next = new URLSearchParams(searchParams)
        Object.entries(updates).forEach(([key, value]) => {
            if (value) next.set(key, value)
            else next.delete(key)
        })
        setSearchParams(next, { replace: true })
    }

    const activeCount = services.filter((service) => service.status === 'active').length
    const inactiveCount = services.length - activeCount
    const metricsUnavailable = loading || (error !== '' && services.length === 0)
    const onSaleCount = services.filter(
        (service) =>
            service.weekday_discount_type !== null ||
            service.weekend_discount_type !== null,
    ).length

    const visibleServices = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase()
        return services
            .filter((service) => {
                if (filter === 'all') return true
                if (filter === 'promotion') {
                    return service.weekday_discount_type !== null ||
                        service.weekend_discount_type !== null
                }
                return service.status === filter
            })
            .filter((service) =>
                normalizedSearch
                    ? `${service.name} ${service.kind}`.toLocaleLowerCase().includes(normalizedSearch)
                    : true,
            )
            .sort((left, right) => {
                if (sort === 'name') return left.name.localeCompare(right.name)
                const leftMetrics = serviceMetrics(summary, left)
                const rightMetrics = serviceMetrics(summary, right)
                if (sort === 'bookings') return (rightMetrics?.bookings ?? 0) - (leftMetrics?.bookings ?? 0)
                if (sort === 'revenue') return (rightMetrics?.revenue ?? 0) - (leftMetrics?.revenue ?? 0)
                return (Number(rightMetrics?.rating ?? right.rating_average ?? 0) -
                    Number(leftMetrics?.rating ?? left.rating_average ?? 0))
            })
    }, [filter, search, services, sort, summary])

    const openAddForm = () => {
        setEditingService(null)
        setFormOpen(true)
    }
    const openEditForm = (service: Service) => {
        setEditingService(service)
        setFormOpen(true)
    }
    const closeForm = () => {
        setFormOpen(false)
        setEditingService(null)
    }

    const handleSaved = (message: string) => {
        closeForm()
        setNotice({ tone: 'success', message })
        void loadData()
    }

    const archiveService = async (service: Service, status: Service['status']) => {
        try {
            await updateServiceStatus(service, status)
            setNotice({
                tone: 'success',
                message: status === 'inactive' ? `${service.name} archived.` : `${service.name} restored.`,
            })
            await loadData()
        } catch (updateFailure) {
            setNotice({
                tone: 'error',
                message: getErrorMessage(updateFailure, 'Unable to update offer status.'),
            })
        }
    }

    const archiveSelected = async () => {
        const selected = services.filter((service) => selectedIds.includes(service.id))
        if (selected.length === 0 || bulkUpdating) return
        setBulkUpdating(true)
        const results = await Promise.allSettled(
            selected.map((service) =>
                updateServiceStatus(service, service.status === 'active' ? 'inactive' : 'active'),
            ),
        )
        const succeeded = results.filter((result) => result.status === 'fulfilled').length
        const failed = results.length - succeeded
        setSelectedIds([])
        setNotice({
            tone: failed ? 'error' : 'success',
            message: failed
                ? `${succeeded} offers updated; ${failed} could not be updated.`
                : `${succeeded} offers updated.`,
        })
        await loadData()
        setBulkUpdating(false)
    }

    const confirmDelete = async () => {
        if (!deletingService) return
        setDeleting(true)
        setDeleteError('')
        try {
            const response = await deleteService(deletingService.id)
            setDeletingService(null)
            setNotice({
                tone: 'success',
                message: response.data.message ?? 'Offer deleted permanently.',
            })
            await loadData()
        } catch (deleteFailure) {
            setDeleteError(getErrorMessage(deleteFailure, 'Unable to delete this offer.'))
        } finally {
            setDeleting(false)
        }
    }

    const allVisibleSelected =
        visibleServices.length > 0 &&
        visibleServices.every((service) => selectedIds.includes(service.id))
    const reservedDates = useMemo(() => {
        const dates = new Set<string>()
        const availability = selectedCalendar
            ? summary?.availability[String(selectedCalendar.id)] ?? []
            : []
        availability.forEach((booking) => {
            const cursor = new Date(`${booking.check_in}T00:00:00`)
            const end = new Date(`${booking.check_out}T00:00:00`)
            while (cursor < end) {
                dates.add(localDateKey(cursor))
                cursor.setDate(cursor.getDate() + 1)
            }
        })
        return dates
    }, [selectedCalendar, summary])
    const calendarDays = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return Array.from({ length: 30 }, (_, index) => {
            const date = new Date(today)
            date.setDate(today.getDate() + index)
            return date
        })
    }, [])

    const columns: AdminTableColumn<Service>[] = [
        {
            key: 'select',
            label: 'Select',
            className: 'w-10',
            render: (service) => (
                <label className="inline-flex min-h-11 min-w-11 items-center">
                    <span className="sr-only">Select {service.name}</span>
                    <input
                        type="checkbox"
                        checked={selectedIds.includes(service.id)}
                        onChange={(event) =>
                            setSelectedIds((current) =>
                                event.target.checked
                                    ? [...current, service.id]
                                    : current.filter((id) => id !== service.id),
                            )
                        }
                        aria-label={`Select ${service.name}`}
                        className={`size-4 accent-[#006dfc] ${focusRing}`}
                    />
                </label>
            ),
        },
        {
            key: 'offer',
            label: 'Offer',
            render: (service) => (
                <button
                    type="button"
                    onClick={() => openEditForm(service)}
                    className={`flex min-h-11 flex-col items-start justify-center rounded-sm text-left ${focusRing}`}
                >
                    <span className="font-medium text-slate-950">{service.name}</span>
                    <span className="text-[10px] capitalize text-slate-500">{service.kind}</span>
                </button>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (service) => (
                <span className="inline-flex min-h-11 items-center gap-2 text-xs capitalize text-slate-700">
                    <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${
                            service.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                    />
                    {service.status === 'active' ? 'Active' : 'Archived'}
                </span>
            ),
        },
        {
            key: 'price',
            label: 'Base price',
            align: 'right',
            className: 'hidden sm:table-cell',
            render: (service) => (
                <span className="font-mono text-xs tabular-nums">{money(Number(service.price))}</span>
            ),
        },
        {
            key: 'performance',
            label: '30-day performance',
            render: (service) => {
                const metrics = serviceMetrics(summary, service)
                return (
                    <AdminStatStrip
                        stats={[
                            {
                                label: 'Bookings',
                                value: numberFormatter.format(metrics?.bookings ?? 0),
                            },
                            {
                                label: 'Revenue',
                                value: money(metrics?.revenue ?? 0),
                            },
                            {
                                label: 'Occupancy',
                                value: `${metrics?.occupancy ?? 0}%`,
                            },
                            {
                                label: 'Rating',
                                value: Number(
                                    metrics?.rating ?? service.rating_average ?? 0,
                                ).toFixed(1),
                                suffix: '/5',
                            },
                        ]}
                        className="gap-x-2 gap-y-0"
                    />
                )
            },
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            render: (service) => (
                <div className="flex items-center justify-end gap-1">
<WarmTooltip content="View availability calendar" side="top">
                    <button
                        type="button"
                        onClick={() => setSelectedCalendar(service)}
                        aria-label={`View ${service.name} availability`}
                        className={`inline-grid size-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 ${focusRing}`}
                    >
                        <CalendarDays className="size-4" aria-hidden="true" />
                    </button>
                </WarmTooltip>
                    <button
                        type="button"
                        onClick={() => void archiveService(service, service.status === 'active' ? 'inactive' : 'active')}
                        className={`min-h-11 rounded-lg px-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 ${focusRing}`}
                    >
                        {service.status === 'active' ? 'Archive' : 'Restore'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeletingService(service)}
                        className={`min-h-11 rounded-lg px-2 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 ${focusRing}`}
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ]

    return (
        <main className="min-h-screen bg-white pb-12 text-slate-900">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <AdminPageHeader
                    eyebrow="Administration / Catalogue"
                    title="Manage offers"
                    subtitle="Keep prices, performance, and booking availability in one working list."
                    hero={{
                        label: 'Active offers',
                        value: metricsUnavailable ? '—' : numberFormatter.format(activeCount),
                        href: metricsUnavailable ? undefined : '/manageOffers?status=active',
                    }}
                    action={
                        <button
                            type="button"
                            onClick={openAddForm}
                            className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#006dfc] px-4 text-xs font-semibold text-white hover:bg-[#0057c9] ${focusRing}`}
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            Add offer
                        </button>
                    }
                />

                <AdminStatStrip
                    stats={[
                        {
                            label: 'All offers',
                            value: metricsUnavailable ? '—' : numberFormatter.format(services.length),
                            href: metricsUnavailable ? undefined : '/manageOffers',
                        },
                        {
                            label: 'Archived',
                            value: metricsUnavailable ? '—' : numberFormatter.format(inactiveCount),
                            href: metricsUnavailable ? undefined : '/manageOffers?status=inactive',
                        },
                        {
                            label: 'On promotion',
                            value: metricsUnavailable ? '—' : numberFormatter.format(onSaleCount),
                            href: metricsUnavailable ? undefined : '/manageOffers?status=promotion',
                        },
                    ]}
                    className="border-b border-[rgba(0,0,0,0.06)] pb-2"
                />

                {notice && (
                    <div
                        role={notice.tone === 'error' ? 'alert' : 'status'}
                        className={`flex min-h-11 items-center gap-3 text-sm ${
                            notice.tone === 'error' ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                    >
                        <span className="flex-1">{notice.message}</span>
                        <button
                            type="button"
                            onClick={() => setNotice(null)}
                            aria-label="Dismiss notification"
                            className={`inline-grid size-11 place-items-center rounded-lg hover:bg-slate-100 ${focusRing}`}
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                )}

                {error && (
                    <div role="alert" className="flex items-center justify-between gap-3 text-sm text-rose-700">
                        <span className="inline-flex items-center gap-2">
                            <CircleAlert className="size-4" aria-hidden="true" />
                            {error}
                        </span>
                        <button
                            type="button"
                            onClick={() => void loadData()}
                            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold hover:bg-slate-100 ${focusRing}`}
                        >
                            <RefreshCw className="size-4" aria-hidden="true" />
                            Retry
                        </button>
                    </div>
                )}

                <AdminCard padding={false}>
                    <div className="flex flex-col gap-4 p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Offer catalogue
                                </p>
                                <h2 className="mt-1 font-serif text-xl font-bold tracking-tight">
                                    Performance by offer
                                </h2>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <label className="min-w-52">
                                    <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Search offers
                                    </span>
                                    <span className="relative block">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="search"
                                            value={search}
                                            onChange={(event) =>
                                                updateParams({ search: event.target.value || null })
                                            }
                                            placeholder="Name or type"
                                            className={`h-11 w-full rounded-lg border border-[rgba(0,0,0,0.1)] pl-9 pr-3 text-sm outline-none focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/20 ${focusRing}`}
                                        />
                                    </span>
                                </label>
                                <label>
                                    <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Sort by
                                    </span>
                                    <select
                                        value={sort}
                                        onChange={(event) =>
                                            updateParams({ sort: event.target.value })
                                        }
                                        className={`h-11 min-w-40 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-3 text-sm ${focusRing}`}
                                    >
                                        {sortOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <AdminFilterPills
                                label="Filter offers by status"
                                value={filter}
                                onChange={(value) =>
                                    updateParams({ status: value === 'all' ? null : value })
                                }
                                options={filters.map((option) => ({
                                    ...option,
                                    count: metricsUnavailable
                                        ? undefined
                                        :
                                        option.value === 'all'
                                            ? services.length
                                            : option.value === 'promotion'
                                              ? onSaleCount
                                            : services.filter((service) => service.status === option.value).length,
                                }))}
                            />
                            {selectedIds.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs tabular-nums text-slate-500">
                                        {selectedIds.length} selected
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => void archiveSelected()}
                                        disabled={bulkUpdating}
                                        className={`min-h-11 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-xs font-semibold disabled:opacity-50 ${focusRing}`}
                                    >
                                        {bulkUpdating ? 'Updating…' : 'Archive / restore'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <p role="status" className="px-5 py-10 text-center text-sm text-slate-500">
                            Loading offers…
                        </p>
                    ) : error && services.length === 0 ? (
                        <p role="status" className="px-5 py-10 text-center text-sm text-slate-500">
                            Offers could not be loaded. Use Retry to try again.
                        </p>
                    ) : services.length === 0 ? (
                        <AdminEmptyState
                            icon={Plus}
                            heading="No offers yet"
                            subtitle="Add the first room or whole-villa offer to begin."
                            ctaLabel="Create an offer"
                            onAction={openAddForm}
                        />
                    ) : visibleServices.length === 0 ? (
                        <AdminEmptyState
                            icon={Search}
                            heading="No matching offers"
                            subtitle="Try another search or status filter."
                            ctaLabel="Clear filters"
                            onAction={() =>
                                updateParams({ status: null, search: null })
                            }
                        />
                    ) : (
                        <div className="px-5 pb-4">
                            <div className="mb-2 flex min-h-11 items-center gap-3">
                                <label className="inline-flex min-h-11 min-w-11 items-center">
                                    <span className="sr-only">Select all visible offers</span>
                                    <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={(event) =>
                                            setSelectedIds((current) =>
                                                event.target.checked
                                                    ? Array.from(
                                                          new Set([
                                                              ...current,
                                                              ...visibleServices.map((service) => service.id),
                                                          ]),
                                                      )
                                                    : current.filter(
                                                          (id) =>
                                                              !visibleServices.some((service) => service.id === id),
                                                      ),
                                            )
                                        }
                                        aria-label="Select all visible offers"
                                        className={`size-4 accent-[#006dfc] ${focusRing}`}
                                    />
                                </label>
                                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Select all visible
                                </span>
                            </div>
                            <AdminTable
                                label="Offer catalogue performance"
                                columns={columns}
                                rows={visibleServices}
                                rowKey={(service) => service.id}
                                empty={null}
                            />
                            <p className="mt-3 text-[10px] leading-5 text-slate-500">
                                30-day performance reflects paid bookings and stays in the selected window. Archive keeps offer history; delete permanently removes the offer.
                            </p>
                        </div>
                    )}
                </AdminCard>
            </div>

            {formOpen && (
                <OfferFormModal
                    key={editingService?.id ?? 'new-offer'}
                    service={editingService}
                    onClose={closeForm}
                    onSaved={handleSaved}
                    onDelete={(service) => {
                        closeForm()
                        setDeletingService(service)
                    }}
                />
            )}

            {deletingService && (
                <ConfirmDialog
                    title={`Delete “${deletingService.name}”?`}
                    description="This permanently removes the offer and its stored images. Archive it instead if you need to keep its booking history."
                    confirmLabel="Delete permanently"
                    loadingLabel="Deleting…"
                    loading={deleting}
                    error={deleteError}
                    onCancel={() => {
                        if (!deleting) {
                            setDeletingService(null)
                            setDeleteError('')
                        }
                    }}
                    onConfirm={() => void confirmDelete()}
                />
            )}

            {selectedCalendar && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setSelectedCalendar(null)
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="availability-title"
                        className="w-full max-w-lg rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-5 shadow-[0_12px_36px_rgba(0,0,0,0.12)]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Next 30 days
                                </p>
                                <h2 id="availability-title" className="mt-1 font-serif text-xl font-bold">
                                    {selectedCalendar.name} availability
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedCalendar(null)}
                                aria-label="Close availability calendar"
                                className={`inline-grid size-11 place-items-center rounded-lg hover:bg-slate-100 ${focusRing}`}
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-7">
                            {calendarDays.map((date) => {
                                const dateKey = localDateKey(date)
                                const reserved = reservedDates.has(dateKey)
                                return (
                                    <div
                                        key={dateKey}
                                        aria-label={`${date.toLocaleDateString()}, ${reserved ? 'booked' : 'available'}`}
                                        className={`grid min-h-12 place-items-center rounded-lg border border-[rgba(0,0,0,0.06)] text-xs ${
                                            reserved ? 'text-slate-400 line-through' : 'text-slate-900'
                                        }`}
                                    >
                                        <span className="text-[8px] uppercase tracking-[0.1em] text-slate-500">
                                            {date.toLocaleDateString('en-PH', { weekday: 'short' })}
                                        </span>
                                        <span className="font-mono tabular-nums">
                                            {date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                        <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                            <span aria-hidden="true" className="size-1.5 rounded-full bg-slate-400" />
                            Dates with confirmed bookings are crossed out.
                        </p>
                    </section>
                </div>
            )}
        </main>
    )
}

export default Offers
