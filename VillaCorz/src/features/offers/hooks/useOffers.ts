import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Service } from '../../../services/types'
import { deleteService, getServices } from '../../../services/serviceService'
import { updateServiceStatus } from '../../../services/serviceService'
import { fetchOfferMetrics } from '../api/offersApi'
import type { OfferSummary } from '../api/offersApi'
import { getApiErrorMessage } from '../../../shared/lib/apiError'

export type OfferFilter = 'all' | 'active' | 'inactive' | 'promotion'
export type OfferSort = 'name' | 'bookings' | 'revenue' | 'rating'
export type OfferNotice = { tone: 'success' | 'error'; message: string }

const filters = [
    { value: 'all', label: 'All offers' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Archived' },
    { value: 'promotion', label: 'On promotion' },
] as const

const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'bookings', label: '30-day bookings' },
    { value: 'revenue', label: '30-day revenue' },
    { value: 'rating', label: 'Rating' },
] as const

export const offerFilters = filters
export const offerSortOptions = sortOptions

export const serviceMetrics = (summary: OfferSummary | null, service: Service) =>
    summary?.offer_metrics.find((metric) => metric.service_id === service.id)

export function useOffers() {
    const [searchParams, setSearchParams] = useSearchParams()
    const filter = (filters.some((item) => item.value === searchParams.get('status'))
        ? searchParams.get('status')
        : 'all') as OfferFilter
    const sort = (sortOptions.some((item) => item.value === searchParams.get('sort'))
        ? searchParams.get('sort')
        : 'name') as OfferSort
    const search = searchParams.get('search') ?? ''

    const [services, setServices] = useState<Service[]>([])
    const [summary, setSummary] = useState<OfferSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState<OfferNotice | null>(null)
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [bulkUpdating, setBulkUpdating] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const [serviceResponse, metricsResponse] = await Promise.all([
                getServices(),
                fetchOfferMetrics(30),
            ])
            setServices(serviceResponse.data.data ?? [])
            setSummary(metricsResponse.data.data)
        } catch (loadFailure) {
            setError(getApiErrorMessage(loadFailure, 'Unable to load offers. Please try again.'))
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

    const updateParams = useCallback(
        (updates: Record<string, string | null>) => {
            const next = new URLSearchParams(searchParams)
            Object.entries(updates).forEach(([key, value]) => {
                if (value) next.set(key, value)
                else next.delete(key)
            })
            setSearchParams(next, { replace: true })
        },
        [searchParams, setSearchParams],
    )

    const archiveService = useCallback(
        async (service: Service, status: Service['status']) => {
            try {
                await updateServiceStatus(service, status)
                setNotice({
                    tone: 'success',
                    message:
                        status === 'inactive'
                            ? `${service.name} archived.`
                            : `${service.name} restored.`,
                })
                await loadData()
            } catch (updateFailure) {
                setNotice({
                    tone: 'error',
                    message: getApiErrorMessage(
                        updateFailure,
                        'Unable to update offer status.',
                    ),
                })
            }
        },
        [loadData],
    )

    const archiveSelected = useCallback(async () => {
        const selected = services.filter((service) =>
            selectedIds.includes(service.id),
        )
        if (selected.length === 0 || bulkUpdating) return
        setBulkUpdating(true)
        const results = await Promise.allSettled(
            selected.map((service) =>
                updateServiceStatus(
                    service,
                    service.status === 'active' ? 'inactive' : 'active',
                ),
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
    }, [bulkUpdating, loadData, selectedIds, services])

    const confirmDelete = useCallback(
        async (service: Service, setDeleting: (value: boolean) => void, setError: (value: string) => void) => {
            setDeleting(true)
            setError('')
            try {
                const response = await deleteService(service.id)
                setNotice({
                    tone: 'success',
                    message: response.data.message ?? 'Offer deleted permanently.',
                })
                await loadData()
                return true
            } catch (deleteFailure) {
                setError(getApiErrorMessage(deleteFailure, 'Unable to delete this offer.'))
                return false
            } finally {
                setDeleting(false)
            }
        },
        [loadData],
    )

    const visibleServices = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase()
        return services
            .filter((service) => {
                if (filter === 'all') return true
                if (filter === 'promotion') {
                    return (
                        service.weekday_discount_type !== null ||
                        service.weekend_discount_type !== null
                    )
                }
                return service.status === filter
            })
            .filter((service) =>
                normalizedSearch
                    ? `${service.name} ${service.kind}`
                          .toLocaleLowerCase()
                          .includes(normalizedSearch)
                    : true,
            )
            .sort((left, right) => {
                if (sort === 'name') return left.name.localeCompare(right.name)
                const leftMetrics = serviceMetrics(summary, left)
                const rightMetrics = serviceMetrics(summary, right)
                if (sort === 'bookings') {
                    return (rightMetrics?.bookings ?? 0) - (leftMetrics?.bookings ?? 0)
                }
                if (sort === 'revenue') {
                    return (rightMetrics?.revenue ?? 0) - (leftMetrics?.revenue ?? 0)
                }
                return (
                    Number(rightMetrics?.rating ?? right.rating_average ?? 0) -
                    Number(leftMetrics?.rating ?? left.rating_average ?? 0)
                )
            })
    }, [filter, search, services, sort, summary])

    const activeCount = services.filter((service) => service.status === 'active').length
    const inactiveCount = services.length - activeCount
    const metricsUnavailable =
        loading || (error !== '' && services.length === 0)
    const onSaleCount = services.filter(
        (service) =>
            service.weekday_discount_type !== null ||
            service.weekend_discount_type !== null,
    ).length
    const allVisibleSelected =
        visibleServices.length > 0 &&
        visibleServices.every((service) => selectedIds.includes(service.id))

    return {
        searchParams,
        filter,
        sort,
        search,
        services,
        summary,
        loading,
        error,
        notice,
        selectedIds,
        setSelectedIds,
        bulkUpdating,
        loadData,
        updateParams,
        archiveService,
        archiveSelected,
        confirmDelete,
        visibleServices,
        activeCount,
        inactiveCount,
        metricsUnavailable,
        onSaleCount,
        allVisibleSelected,
        setNotice,
        setError,
    }
}
