import api from './api'
import type { ApiEnvelope } from './types'

export type BackupFile = {
    filename: string
    size: number
    created_at: string
}

export const listBackups = () =>
    api.get<ApiEnvelope<BackupFile[]>>('/backups')

export const createBackup = () =>
    api.post<ApiEnvelope<BackupFile>>('/backups')

export const downloadBackup = (filename: string) =>
    api.get<Blob>(`/backups/${encodeURIComponent(filename)}/download`, {
        responseType: 'blob',
    })
