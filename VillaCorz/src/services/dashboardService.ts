import api from './api'
import type {
    AdminReportKind,
    AdminReportResponse,
    AdminReportSchedule,
    ApiEnvelope,
    DashboardSummary,
} from './types'

export type DashboardForecastOptions = {
    forecastPreset?: '14' | '30' | '60'
    backtestRange?: 7 | 14 | 30
    includeHolidays?: boolean
    includeWeekends?: boolean
}

export const getDashboard = (
    range: 7 | 30 | 90 = 30,
    options: DashboardForecastOptions = {},
) => {
    const params = new URLSearchParams({
        range: String(range),
        forecast_preset: String(options.forecastPreset ?? '30'),
        backtest_range: String(options.backtestRange ?? 14),
        include_holidays: String(options.includeHolidays ?? true),
        include_weekends: String(options.includeWeekends ?? true),
    })

    return api.get<ApiEnvelope<DashboardSummary>>(`/dashboard?${params.toString()}`)
}

export const trackPageView = (path: string, referrer?: string) =>
    api.post('/page-views', { path, referrer })

export const getAdminReport = (params: {
    report: AdminReportKind
    from?: string
    to?: string
    date_field?: 'check_in'
    search?: string
    status?: string
    page?: number
    per_page?: number
}) => api.get<AdminReportResponse>('/reports', { params })

export const exportAdminReport = (params: {
    report: AdminReportKind
    from?: string
    to?: string
    date_field?: 'check_in'
    search?: string
    status?: string
}) =>
    api.get<Blob>('/reports/export', {
        params,
        responseType: 'blob',
    })

export const markContactMessageRead = (id: number) =>
    api.patch(`/reports/contacts/${id}/read`)

export const getReportSchedules = () =>
    api.get<{ success: boolean; data: AdminReportSchedule[] }>('/reports/schedules')

export const createReportSchedule = (payload: {
    report: Exclude<AdminReportKind, 'activity'>
    email: string
    frequency: 'weekly' | 'monthly'
}) =>
    api.post<{ success: boolean; data: AdminReportSchedule }>(
        '/reports/schedules',
        payload,
    )

export const deleteReportSchedule = (id: number) =>
    api.delete(`/reports/schedules/${id}`)
