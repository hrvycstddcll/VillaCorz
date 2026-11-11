import api from './api'
import type {
    ActivityLogPage,
    ActivityLogQuery,
    ActivityLogSummary,
} from './types'

export const getActivityLogs = (params: ActivityLogQuery) =>
    api.get<ActivityLogPage>('/activity-logs', { params })

export const getActivityLogSummary = () =>
    api.get<{ success: boolean; data: ActivityLogSummary }>(
        '/activity-logs/summary',
    )

export const exportActivityLogs = (params: ActivityLogQuery) =>
    api.get<Blob>('/activity-logs/export', {
        params,
        responseType: 'blob',
    })
