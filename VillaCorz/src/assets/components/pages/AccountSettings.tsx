import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react'
import AccountPasswordInput from '../ui/AccountPasswordInput'
import { useAuth } from '../../../services/useAuth'
import {
    updateAccountPassword,
    updateAccountProfile,
} from '../../../services/accountService'

type FieldErrors = Record<string, string[] | undefined>

const apiMessage = (error: unknown, fallback: string) => {
    if (!axios.isAxiosError(error)) return fallback

    const data = error.response?.data as
        | { message?: string; errors?: FieldErrors }
        | undefined
    const fieldMessage = data?.errors
        ? Object.values(data.errors).flat()[0]
        : undefined

    return fieldMessage ?? data?.message ?? fallback
}

const AccountSettings = () => {
    const { user, setUser } = useAuth()
    const navigate = useNavigate()
    const [firstname, setFirstname] = useState(user?.firstname ?? '')
    const [lastname, setLastname] = useState(user?.lastname ?? '')
    const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '')
    const [profilePassword, setProfilePassword] = useState('')
    const [profileStatus, setProfileStatus] = useState('')
    const [profileError, setProfileError] = useState('')
    const [isProfileSaving, setIsProfileSaving] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')
    const [passwordStatus, setPasswordStatus] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [isPasswordSaving, setIsPasswordSaving] = useState(false)

    if (!user) return null

    const hasProfileChanges =
        firstname !== user.firstname ||
        lastname !== user.lastname ||
        phoneNumber !== (user.phone_number ?? '')

    const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setProfileError('')
        setProfileStatus('')
        setIsProfileSaving(true)

        try {
            const response = await updateAccountProfile(
                firstname.trim(),
                lastname.trim(),
                phoneNumber.trim(),
                profilePassword,
            )
            if (!response.data.user) {
                throw new Error('The server did not return the updated account.')
            }

            setUser(response.data.user)
            setFirstname(response.data.user.firstname)
            setLastname(response.data.user.lastname)
            setPhoneNumber(response.data.user.phone_number ?? '')
            setProfilePassword('')
            setProfileStatus(response.data.message)
        } catch (error) {
            setProfileError(
                apiMessage(error, 'Unable to save account details. Please try again.'),
            )
        } finally {
            setIsProfileSaving(false)
        }
    }

    const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setPasswordError('')
        setPasswordStatus('')

        if (newPassword !== passwordConfirmation) {
            setPasswordError('The new passwords do not match.')
            return
        }

        setIsPasswordSaving(true)
        try {
            const response = await updateAccountPassword(
                currentPassword,
                newPassword,
                passwordConfirmation,
            )
            setCurrentPassword('')
            setNewPassword('')
            setPasswordConfirmation('')
            setPasswordStatus(response.data.message)
        } catch (error) {
            setPasswordError(
                apiMessage(error, 'Unable to change your password. Please try again.'),
            )
        } finally {
            setIsPasswordSaving(false)
        }
    }

    return (
        <main className="min-h-svh bg-slate-50 px-4 pb-12 pt-8 font-poppins sm:px-7 sm:pt-10">
            <div className="mx-auto w-full max-w-3xl">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#006dfc] px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                >
                    Back
                </button>
                <header className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#006dfc]">
                        Your account
                    </p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Account settings
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Keep your contact details current and manage your sign-in security.
                    </p>
                </header>

                <div className="space-y-6">
                    <section
                        aria-labelledby="profile-title"
                        className="rounded-2xl bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.08)] sm:p-7"
                    >
                        <div className="mb-6 flex items-start gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#006dfc]">
                                <UserRound className="size-5" aria-hidden="true" />
                            </span>
                            <div>
                                <h2 id="profile-title" className="text-lg font-semibold text-slate-900">
                                    Personal information
                                </h2>
                                <p className="mt-1 text-sm leading-5 text-slate-600">
                                    Update the name and phone number used for your bookings.
                                </p>
                            </div>
                        </div>

                        <form className="space-y-5" onSubmit={handleProfileSubmit}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                                        First name
                                    </span>
                                    <input
                                        value={firstname}
                                        onChange={(event) => setFirstname(event.target.value)}
                                        required
                                        maxLength={255}
                                        autoComplete="given-name"
                                        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/20"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Last name
                                    </span>
                                    <input
                                        value={lastname}
                                        onChange={(event) => setLastname(event.target.value)}
                                        required
                                        maxLength={255}
                                        autoComplete="family-name"
                                        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/20"
                                    />
                                </label>
                            </div>
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Email address
                                </span>
                                <input
                                    value={user.email}
                                    readOnly
                                    autoComplete="email"
                                    aria-describedby="account-email-note"
                                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-600"
                                />
                                <span id="account-email-note" className="mt-1.5 block text-xs text-slate-500">
                                    Email is used to sign in and cannot be changed here.
                                </span>
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Phone number
                                </span>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(event) => setPhoneNumber(event.target.value)}
                                    maxLength={32}
                                    autoComplete="tel"
                                    placeholder="+63 9XX XXX XXXX"
                                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/20"
                                />
                            </label>
                            {hasProfileChanges && (
                                <AccountPasswordInput
                                    id="profile-current-password"
                                    label="Confirm your current password to save changes"
                                    value={profilePassword}
                                    onChange={setProfilePassword}
                                    autoComplete="current-password"
                                />
                            )}
                            {profileError && (
                                <p role="alert" className="text-sm text-red-700">
                                    {profileError}
                                </p>
                            )}
                            {profileStatus && (
                                <p role="status" className="text-sm text-emerald-700">
                                    {profileStatus}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                <button
                                    type="submit"
                                    disabled={!hasProfileChanges || !profilePassword || isProfileSaving}
                                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#006dfc] px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    {isProfileSaving ? 'Saving…' : 'Save changes'}
                                </button>
                                {hasProfileChanges && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFirstname(user.firstname)
                                            setLastname(user.lastname)
                                            setPhoneNumber(user.phone_number ?? '')
                                            setProfilePassword('')
                                            setProfileError('')
                                            setProfileStatus('')
                                        }}
                                        className="min-h-11 rounded-lg px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                    >
                                        Discard
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>

                    <section
                        aria-labelledby="password-title"
                        className="rounded-2xl bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.08)] sm:p-7"
                    >
                        <div className="mb-6 flex items-start gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#006dfc]">
                                <ShieldCheck className="size-5" aria-hidden="true" />
                            </span>
                            <div>
                                <h2 id="password-title" className="text-lg font-semibold text-slate-900">
                                    Password and security
                                </h2>
                                <p className="mt-1 text-sm leading-5 text-slate-600">
                                    Use your current password to choose a new one.
                                </p>
                            </div>
                        </div>

                        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                            <AccountPasswordInput
                                id="current-password"
                                label="Current password"
                                value={currentPassword}
                                onChange={setCurrentPassword}
                                autoComplete="current-password"
                            />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <AccountPasswordInput
                                    id="new-password"
                                    label="New password"
                                    value={newPassword}
                                    onChange={setNewPassword}
                                    autoComplete="new-password"
                                />
                                <AccountPasswordInput
                                    id="confirm-new-password"
                                    label="Confirm new password"
                                    value={passwordConfirmation}
                                    onChange={setPasswordConfirmation}
                                    autoComplete="new-password"
                                />
                            </div>
                            <p className="text-xs leading-5 text-slate-500">
                                Use at least 8 characters. Password managers and paste are supported.
                            </p>
                            {passwordError && (
                                <p role="alert" className="text-sm text-red-700">
                                    {passwordError}
                                </p>
                            )}
                            {passwordStatus && (
                                <p role="status" className="text-sm text-emerald-700">
                                    {passwordStatus}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 pt-1">
                                <button
                                    type="submit"
                                    disabled={!currentPassword || !newPassword || !passwordConfirmation || isPasswordSaving}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#006dfc] px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    <KeyRound className="size-4" aria-hidden="true" />
                                    {isPasswordSaving ? 'Updating…' : 'Update password'}
                                </button>
                                <Link
                                    to="/forgot-password"
                                    state={{ email: user.email }}
                                    className="inline-flex min-h-11 items-center text-sm font-medium text-[#006dfc] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                                >
                                    Forgot your password?
                                </Link>
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        </main>
    )
}

export default AccountSettings
