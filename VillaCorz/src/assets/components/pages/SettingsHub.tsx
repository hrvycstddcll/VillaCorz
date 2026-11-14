import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, UserRound } from 'lucide-react'
import BackButton from '../ui/BackButton'
import LogoutModal from '../ui/LogoutModal'
import { useAuth } from '../../../services/useAuth'

const optionCardClassName =
    'group flex w-full items-start gap-4 rounded-2xl border border-transparent bg-white p-5 text-left shadow-[0_4px_18px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow] duration-150 hover:border-[#006dfc]/20 hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const optionChevronClassName =
    'mt-2.5 size-5 shrink-0 text-slate-400 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-[#006dfc] motion-reduce:transition-none'

const SettingsHub = () => {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const [showLogoutModal, setShowLogoutModal] = useState(false)

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

                <p className="mt-6 text-xs leading-5 text-slate-500">
                    System settings will appear here as they become available.
                </p>
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
