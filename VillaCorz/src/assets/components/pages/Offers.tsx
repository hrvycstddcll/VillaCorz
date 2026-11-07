import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import {
    AlertCircle,
    CheckCircle2,
    Images,
    Pencil,
    Plus,
    RefreshCw,
    SearchX,
    Trash2,
    X,
} from 'lucide-react'
import type { Service } from '../../../services/types'
import {
    deleteService,
    getServices,
} from '../../../services/serviceService'
import AddOfferCard from '../offers/AddOfferCard'
import OfferFormModal from '../offers/OfferFormModal'
import ConfirmDialog from '../offers/ConfirmDialog'
import ServiceTile, { type ServiceTileStay } from '../ui/ServiceTile'
import fallbackOfferImage from '../../images/wholevilla.png'

type Notice = {
    type: 'success' | 'error'
    message: string
}

type OfferFilter = 'all' | 'active' | 'inactive'

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const getErrorMessage = (
    error: unknown,
    fallback = 'Unable to load offers. Please try again.',
) => {
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
            return 'Your session has expired. Please sign in again.'
        }

        if (error.response?.status === 403) {
            return 'You do not have permission to manage offers.'
        }

        const data = error.response?.data as { message?: string } | undefined

        if (data?.message) {
            return data.message
        }
    }

    return fallback
}

const formatUpdated = (value: string) => {
    if (!value) return 'Recently'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Recently'
    }

    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date)
}

const toServiceTileStay = (service: Service): ServiceTileStay => {
    const images = service.images ?? []
    const primaryImage =
        images.find((image) => image.is_primary) ?? images[0] ?? null
    const photoCount = images.length

    return {
        id: String(service.id),
        title: service.name,
        image: primaryImage?.image_url ?? fallbackOfferImage,
        price: Number(service.price),
        capacity: 'Good for all pax',
        rating: `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`,
    }
}

const OffersSkeleton = () => (
    <div
        role="listitem"
        aria-hidden="true"
        className="flex w-[72vw] min-w-0 shrink-0 snap-start flex-col gap-3 sm:w-auto sm:shrink"
    >
        <div className="animate-pulse overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5">
            <div className="h-56 bg-slate-200/70 sm:h-64 lg:h-72" />
        </div>
        <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
                <div className="h-6 w-20 rounded-full bg-slate-100" />
                <div className="h-8 w-28 rounded-lg bg-slate-100" />
            </div>
            <div className="mt-3 space-y-2">
                <div className="h-3 w-full rounded-full bg-slate-100" />
                <div className="h-3 w-4/5 rounded-full bg-slate-100" />
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="h-2.5 w-20 rounded-full bg-slate-100" />
                <div className="h-2.5 w-24 rounded-full bg-slate-100" />
            </div>
        </div>
    </div>
)

type OfferManagementPanelProps = {
    service: Service
    onEdit: (service: Service) => void
    onDelete: (service: Service) => void
}

const OfferManagementPanel = ({
    service,
    onEdit,
    onDelete,
}: OfferManagementPanelProps) => {
    const isActive = service.status === 'active'
    const imageCount = service.images?.length ?? 0
    const description = service.description?.trim()

    return (
        <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 group-hover:border-[#006dfc]/25 group-hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                        isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-slate-100 text-slate-600 ring-slate-200'
                    }`}
                >
                    <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${
                            isActive ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                    />
                    {isActive ? 'Active' : 'Inactive'}
                </span>

                <div className="flex shrink-0 items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onEdit(service)}
                        aria-label={`Edit ${service.name}`}
                        className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#006dfc]/40 hover:bg-[#006dfc]/5 hover:text-[#006dfc] ${focusRing}`}
                    >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(service)}
                        aria-label={`Delete ${service.name}`}
                        className={`inline-grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 ${focusRing}`}
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">
                {description ||
                    'No description has been added for this offer yet.'}
            </p>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 gap-y-1 border-t border-slate-100 pt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                    <Images className="size-3.5" aria-hidden="true" />
                    {imageCount} {imageCount === 1 ? 'photo' : 'photos'}
                </span>
                <span className="whitespace-nowrap">
                    Updated {formatUpdated(service.updated_at)}
                </span>
            </div>
        </div>
    )
}

type OfferTileProps = {
    service: Service
    onEdit: (service: Service) => void
    onDelete: (service: Service) => void
}

const OfferTile = ({ service, onEdit, onDelete }: OfferTileProps) => (
    <div
        role="listitem"
        className="group flex w-[72vw] min-w-0 shrink-0 snap-start flex-col gap-3 sm:w-auto sm:shrink"
    >
        <ServiceTile
            variant="room"
            stay={toServiceTileStay(service)}
            isSelected={false}
            isReservationSelected={false}
            onSelect={() => onEdit(service)}
            onToggleReservation={() => onEdit(service)}
        />
        <OfferManagementPanel
            service={service}
            onEdit={onEdit}
            onDelete={onDelete}
        />
    </div>
)

type AddOfferCardSlotProps = {
    onClick: () => void
    fullWidth?: boolean
}

const AddOfferCardSlot = ({
    onClick,
    fullWidth = false,
}: AddOfferCardSlotProps) => (
    <div
        role="listitem"
        className={`flex min-w-0 [&>button]:h-full [&>button]:w-full ${
            fullWidth
                ? 'w-full sm:col-span-2 sm:w-auto xl:col-span-3'
                : 'w-[72vw] shrink-0 snap-start sm:w-auto sm:shrink'
        }`}
    >
        <AddOfferCard onClick={onClick} />
    </div>
)

const ManageOffers = () => {
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [formOpen, setFormOpen] = useState(false)
    const [editingService, setEditingService] = useState<Service | null>(null)
    const [deletingService, setDeletingService] = useState<Service | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState('')
    const [notice, setNotice] = useState<Notice | null>(null)
    const [filter, setFilter] = useState<OfferFilter>('all')

    const loadServices = useCallback(async () => {
        setLoading(true)

        try {
            const response = await getServices()
            setServices(response.data.data ?? [])
            setLoadError('')
        } catch (error) {
            setLoadError(getErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let active = true

        getServices()
            .then((response) => {
                if (!active) return

                setServices(response.data.data ?? [])
                setLoadError('')
            })
            .catch((error) => {
                if (active) {
                    setLoadError(getErrorMessage(error))
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false)
                }
            })

        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        if (!notice) return

        const timeout = window.setTimeout(() => setNotice(null), 5000)

        return () => window.clearTimeout(timeout)
    }, [notice])

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
        setNotice({ type: 'success', message })
        void loadServices()
    }

    const openDeleteDialog = (service: Service) => {
        setDeleteError('')
        setDeletingService(service)
    }

    const closeDeleteDialog = () => {
        if (deleting) return

        setDeletingService(null)
        setDeleteError('')
    }

    const confirmDelete = async () => {
        if (!deletingService) return

        setDeleting(true)
        setDeleteError('')

        try {
            const response = await deleteService(deletingService.id)
            setDeletingService(null)
            setNotice({
                type: 'success',
                message:
                    response.data.message ?? 'Offer deleted successfully.',
            })
            await loadServices()
        } catch (error) {
            setDeleteError(
                getErrorMessage(
                    error,
                    'Unable to delete the offer. Please try again.',
                ),
            )
        } finally {
            setDeleting(false)
        }
    }

    const activeCount = services.filter(
        (service) => service.status === 'active',
    ).length
    const inactiveCount = services.length - activeCount
    const isEmpty = !loading && services.length === 0
    const filteredServices =
        filter === 'all'
            ? services
            : services.filter((service) => service.status === filter)
    const filterOptions: { value: OfferFilter; label: string; count: number }[] =
        [
            { value: 'all', label: 'All', count: services.length },
            { value: 'active', label: 'Active', count: activeCount },
            { value: 'inactive', label: 'Inactive', count: inactiveCount },
        ]

    return (
        <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-10">
            <div className="flex flex-col gap-8">
                <header
                    aria-labelledby="manage-offers-heading"
                    className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-8 sm:py-9"
                >
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#006dfc]/[0.07] blur-3xl"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute right-10 top-10 hidden size-24 rounded-full border border-[#006dfc]/10 lg:block"
                    />

                    <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#006dfc]">
                                <span
                                    aria-hidden="true"
                                    className="h-px w-6 bg-[#006dfc]"
                                />
                                VillaCorz Admin
                            </p>
                            <h1
                                id="manage-offers-heading"
                                className="mt-3 font-serif text-3xl font-bold tracking-tight text-[#003079] sm:text-4xl"
                            >
                                Manage Offers
                            </h1>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                                Shape the experiences guests can book, from
                                quiet rooms to the whole beach house. Keep
                                pricing, photos, and availability in one place.
                            </p>
                        </div>

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                            <button
                                type="button"
                                onClick={() => void loadServices()}
                                disabled={loading}
                                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-[#006dfc]/30 hover:bg-[#006dfc]/5 hover:text-[#006dfc] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                            >
                                <RefreshCw
                                    className={`size-4 ${
                                        loading ? 'animate-spin' : ''
                                    }`}
                                    aria-hidden="true"
                                />
                                Refresh
                            </button>
                            <button
                                type="button"
                                onClick={openAddForm}
                                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#006dfc] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,109,252,0.24)] transition duration-200 hover:bg-[#0057cc] hover:shadow-[0_10px_24px_rgba(0,109,252,0.28)] active:scale-[0.99] ${focusRing}`}
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Add offer
                            </button>
                        </div>
                    </div>

                    <dl
                        aria-label="Offer summary"
                        className="relative mt-8 grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 pt-5"
                    >
                        {[
                            { label: 'Offers', value: services.length },
                            { label: 'Active', value: activeCount },
                            { label: 'Inactive', value: inactiveCount },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="px-3 first:pl-0 last:pr-0 sm:px-4"
                            >
                                <dt className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[10px]">
                                    {stat.label}
                                </dt>
                                <dd className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#003079] sm:text-3xl">
                                    {loading ? '—' : stat.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </header>

                {notice && (
                    <div
                        role="status"
                        aria-live="polite"
                        className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
                            notice.type === 'success'
                                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                                : 'border-rose-200 bg-rose-50/80 text-rose-900'
                        }`}
                    >
                        <span
                            className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${
                                notice.type === 'success'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-700'
                            }`}
                        >
                            {notice.type === 'success' ? (
                                <CheckCircle2
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ) : (
                                <AlertCircle
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            )}
                        </span>
                        <p className="flex-1 pt-1 leading-5">
                            {notice.message}
                        </p>
                        <button
                            type="button"
                            onClick={() => setNotice(null)}
                            aria-label="Dismiss notification"
                            className={`inline-grid size-8 shrink-0 place-items-center rounded-full transition ${
                                notice.type === 'success'
                                    ? 'text-emerald-700 hover:bg-emerald-100'
                                    : 'text-rose-700 hover:bg-rose-100'
                            } ${focusRing}`}
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                )}

                {loadError && (
                    <div
                        role="alert"
                        className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="flex items-start gap-3">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-700">
                                <AlertCircle
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </span>
                            <p className="pt-1 leading-5">{loadError}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void loadServices()}
                            className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 ${focusRing}`}
                        >
                            <RefreshCw className="size-3.5" aria-hidden="true" />
                            Try again
                        </button>
                    </div>
                )}

                <section
                    aria-labelledby="offer-list-heading"
                    aria-busy={loading}
                    className="flex flex-col gap-5"
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#006dfc]">
                                Offer catalogue
                            </p>
                            <h2
                                id="offer-list-heading"
                                className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#003079]"
                            >
                                Your offers
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Select an offer to edit it, or use the quick
                                actions beneath each card.
                            </p>
                        </div>

                        {!isEmpty && (
                            <div
                                role="group"
                                aria-label="Filter offers"
                                className="inline-flex max-w-full self-start overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                            >
                                {filterOptions.map((option) => {
                                    const isCurrent = filter === option.value

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            aria-pressed={isCurrent}
                                            onClick={() =>
                                                setFilter(option.value)
                                            }
                                            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${focusRing} ${
                                                isCurrent
                                                    ? 'bg-[#006dfc] text-white shadow-sm'
                                                    : 'text-slate-600 hover:bg-[#006dfc]/5 hover:text-[#003079]'
                                            }`}
                                        >
                                            {option.label}
                                            <span
                                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                                    isCurrent
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                {option.count}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {isEmpty ? (
                        <div
                            role="list"
                            aria-label="Offers"
                            className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                        >
                            <AddOfferCardSlot
                                onClick={openAddForm}
                                fullWidth
                            />
                        </div>
                    ) : !loading && filteredServices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
                            <span className="grid size-12 place-items-center rounded-full bg-[#006dfc]/10 text-[#006dfc]">
                                <SearchX
                                    className="size-6"
                                    aria-hidden="true"
                                />
                            </span>
                            <p className="mt-3 font-serif text-xl font-bold text-[#003079]">
                                No {filter} offers
                            </p>
                            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                                Try another filter or add a new offer to your
                                catalogue.
                            </p>
                            <button
                                type="button"
                                onClick={() => setFilter('all')}
                                className={`mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-[#006dfc]/30 hover:bg-[#006dfc]/5 hover:text-[#006dfc] ${focusRing}`}
                            >
                                Show all offers
                            </button>
                        </div>
                    ) : (
                        <div
                            role="list"
                            aria-label="Offers"
                            className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3"
                        >
                            {loading
                                ? Array.from({ length: 3 }, (_, index) => (
                                      <OffersSkeleton key={index} />
                                  ))
                                : filteredServices.map((service) => (
                                      <OfferTile
                                          key={service.id}
                                          service={service}
                                          onEdit={openEditForm}
                                          onDelete={openDeleteDialog}
                                      />
                                  ))}

                            {!loading && (
                                <AddOfferCardSlot onClick={openAddForm} />
                            )}
                        </div>
                    )}
                </section>
            </div>

            {formOpen && (
                <OfferFormModal
                    key={editingService?.id ?? 'new-offer'}
                    service={editingService}
                    onClose={closeForm}
                    onSaved={handleSaved}
                />
            )}

            {deletingService && (
                <ConfirmDialog
                    title={`Delete “${deletingService.name}”?`}
                    description="This will permanently remove the offer and its stored images. This action cannot be undone."
                    confirmLabel="Delete offer"
                    loading={deleting}
                    error={deleteError}
                    onCancel={closeDeleteDialog}
                    onConfirm={() => void confirmDelete()}
                />
            )}
        </main>
    )
}

export default ManageOffers
