import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    ChevronRight,
    Database,
    Download,
    Loader2,
    LogOut,
    UserRound,
} from 'lucide-react'
import BackButton from '../ui/InteractiveComponents/BackButton'
import LogoutModal from '../ui/ModalComponents/LogoutModal'
import { useAuth } from '../../../services/useAuth'
import {
    createBackup,
    downloadBackup,
    listBackups,
    type BackupFile,
} from '../../../services/backupService'

const optionCardClassName =
    'group flex w-full items-start gap-4 rounded-2xl border border-transparent bg-white p-5 text-left shadow-[0_4px_18px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow] duration-150 hover:border-[#006dfc]/20 hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const optionChevronClassName =
    'mt-2.5 size-5 shrink-0 text-slate-400 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-[#006dfc] motion-reduce:transition-none'

const SettingsHub = () => {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const [showLogoutModal, setShowLogoutModal] = useState(false)
    const [backups, setBackups] = useState<BackupFile[]>([])
    const [backupBusy, setBackupBusy] = useState(false)
    const [backupError, setBackupError] = useState<string | null>(null)
    const isAdmin = user?.role === 'admin'

    const fullName = [user?.firstname, user?.lastname]
        .filter(Boolean)
        .join(' ')
        .trim()

    const initials = useMemo(() => {
        const letters = [user?.firstname, user?.lastname]
            .filter(Boolean)
            .map((part) => part!.charAt(0).toUpperCase())
            .join('')

        return letters || 'VC'
    }, [user?.firstname, user?.lastname])

    const handleLogout = async () => {
        try {
            await logout()
            setShowLogoutModal(false)
            navigate('/')
        } catch {
            alert('Unable to log out. Please try again.')
        }
    }

    useEffect(() => {
        if (!isAdmin) {
            return
        }

        let active = true

        listBackups()
            .then((response) => {
                if (active) {
                    setBackups(response.data.data)
                }
            })
            .catch(() => {
                if (active) {
                    setBackupError('Unable to load saved backups.')
                }
            })

        return () => {
            active = false
        }
    }, [isAdmin])

    const handleCreateBackup = async () => {
        setBackupBusy(true)
        setBackupError(null)

        try {
            const response = await createBackup()
            setBackups((previous) => [response.data.data, ...previous])
        } catch {
            setBackupError('Unable to save a backup. Please try again.')
        } finally {
            setBackupBusy(false)
        }
    }

    const handleDownloadBackup = async (filename: string) => {
        setBackupBusy(true)
        setBackupError(null)

        try {
            const response = await downloadBackup(filename)
            const url = URL.createObjectURL(response.data)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = filename
            document.body.appendChild(anchor)
            anchor.click()
            anchor.remove()
            URL.revokeObjectURL(url)
        } catch {
            setBackupError('Unable to download the backup. Please try again.')
        } finally {
            setBackupBusy(false)
        }
    }

    return (
        <main className="min-h-svh bg-slate-50 px-4 pb-12 pt-8 font-poppins sm:px-7 sm:pt-10">
            <div className="mx-auto w-full max-w-3xl">
                <BackButton className="mb-4" />

                <header className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#006dfc]">
                        Your account
                    </p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Settings
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Manage your account details, sign-in security, and this
                        session.
                    </p>
                </header>

                {user && (
                    <div className="mb-8 flex items-center gap-4 rounded-2xl bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.08)]">
                        <span
                            aria-hidden="true"
                            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#006dfc]/10 text-base font-semibold text-[#006dfc]"
                        >
                            {initials}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                                {fullName || 'Your account'}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                {user.email}
                            </p>
                        </div>
                    </div>
                )}

                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Account
                </h2>

                <div className="grid gap-3">
                    <Link
                        to="/account/settings"
                        className={optionCardClassName}
                    >
                        <span
                            aria-hidden="true"
                            className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#006dfc]"
                        >
                            <UserRound className="size-5" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-base font-semibold text-slate-900">
                                Account settings
                            </span>
                            <span className="mt-1 text-sm leading-5 text-slate-600">
                                Name, contact details, and password.
                            </span>
                        </span>
                        <ChevronRight
                            aria-hidden="true"
                            className={optionChevronClassName}
                        />
                    </Link>

                    <button
                        type="button"
                        onClick={() => setShowLogoutModal(true)}
                        className={optionCardClassName}
                    >
                        <span
                            aria-hidden="true"
                            className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"
                        >
                            <LogOut className="size-5" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-base font-semibold text-rose-600">
                                Log out
                            </span>
                            <span className="mt-1 text-sm leading-5 text-slate-600">
                                Sign out of VillaCorz on this device.
                            </span>
                        </span>
                        <ChevronRight
                            aria-hidden="true"
                            className={`${optionChevronClassName} group-hover:text-rose-500`}
                        />
                    </button>
                </div>

                {isAdmin ? (
                    <section className="mt-8" aria-label="System backups">
                        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            System
                        </h2>
                        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.08)]">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-base font-semibold text-slate-900">
                                        Save backup
                                    </p>
                                    <p className="mt-1 text-sm leading-5 text-slate-600">
                                        Download a plain SQL backup of the
                                        database.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCreateBackup}
                                    disabled={backupBusy}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#006dfc] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0057c9] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {backupBusy ? (
                                        <Loader2
                                            aria-hidden="true"
                                            className="size-4 animate-spin"
                                        />
                                    ) : (
                                        <Database
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                    )}
                                    {backupBusy ? 'Saving…' : 'Save backup'}
                                </button>
                            </div>

                            {backupError && (
                                <p
                                    role="alert"
                                    className="mt-3 text-sm text-rose-600"
                                >
                                    {backupError}
                                </p>
                            )}

                            {backups.length > 0 ? (
                                <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                                    {backups.map((backup) => (
                                        <li
                                            key={backup.filename}
                                            className="flex flex-wrap items-center justify-between gap-3 py-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate font-mono text-xs text-slate-700">
                                                    {backup.filename}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {new Date(
                                                        backup.created_at,
                                                    ).toLocaleString()}{' '}
                                                    ·{' '}
                                                    {(
                                                        backup.size / 1024 / 1024
                                                    ).toFixed(2)}{' '}
                                                    MB
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDownloadBackup(
                                                        backup.filename,
                                                    )
                                                }
                                                disabled={backupBusy}
                                                aria-label={`Download ${backup.filename}`}
                                                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <Download
                                                    aria-hidden="true"
                                                    className="size-3.5"
                                                />
                                                Download
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-4 text-xs text-slate-500">
                                    No backups saved yet.
                                </p>
                            )}
                        </div>
                    </section>
                ) : (
                    <p className="mt-6 text-xs leading-5 text-slate-500">
                        System settings will appear here as they become
                        available.
                    </p>
                )}
            </div>

            {showLogoutModal && (
                <LogoutModal
                    onCancel={() => setShowLogoutModal(false)}
                    onConfirm={handleLogout}
                />
            )}
        </main>
    )
}

export default SettingsHub
