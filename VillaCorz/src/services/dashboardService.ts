import api from './api'
import type { ApiEnvelope, DashboardSummary } from './types'

export const getDashboard = (range: 7 | 30 | 90 = 30) =>
    api.get<ApiEnvelope<DashboardSummary>>(`/dashboard?range=${range}`)

export const trackPageView = (path: string, referrer?: string) =>
    api.post('/page-views', { path, referrer })
