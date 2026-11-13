import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import {
    BadgeCheck,
    KeyRound,
    Phone,
    Plus,
    ShieldCheck,
    Star,
    Trash2,
    UserRound,
} from 'lucide-react'
import AccountPasswordInput from '../ui/AccountPasswordInput'
import PhoneNumberInput from '../ui/PhoneNumberInput'
import PhoneVerifyModal from '../ui/PhoneVerifyModal'
import { useAuth } from '../../../services/useAuth'
import { formatPhoneNumber, normalizePhoneNumber } from '../../../lib/phoneNumber'
import {
    updateAccountPassword,
    updateAccountProfile,
} from '../../../services/accountService'
import {
    addAccountPhoneNumber,
    confirmPhoneNumberVerification,
    deleteAccountPhoneNumber,
    sendPhoneNumberVerification,
    updateAccountPhoneNumber,
} from '../../../services/phoneNumberService'
import type { UserPhoneNumber } from '../../../services/types'

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

const smallButton =
    'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const AccountSettings = () => {
    const { user, setUser } = useAuth()
    const navigate = useNavigate()
    const [firstname, setFirstname] = useState(user?.firstname ?? '')
    const [lastname, setLastname] = useState(user?.lastname ?? '')
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

    const [newPhoneNumber, setNewPhoneNumber] = useState('')
    const [phoneError, setPhoneError] = useState('')
    const [phoneStatus, setPhoneStatus] = useState('')
    const [phoneBusyId, setPhoneBusyId] = useState<number | null>(null)
    const [isAddingPhone, setIsAddingPhone] = useState(false)

    const [verifyTarget, setVerifyTarget] = useState<UserPhoneNumber | null>(null)
    const [verifyCode, setVerifyCode] = useState('')
    const [verifyError, setVerifyError] = useState('')
    const [verifyStatus, setVerifyStatus] = useState('')
    const [developmentCode, setDevelopmentCode] = useState('')
    const [isSendingCode, setIsSendingCode] = useState(false)
    const [isVerifyingCode, setIsVerifyingCode] = useState(false)

    if (!user) return null

    const phoneNumbers = user.phone_numbers ?? []
    const hasProfileChanges =
        firstname !== user.firstname || lastname !== user.lastname

    const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setProfileError('')
        setProfileStatus('')
        setIsProfileSaving(true)

        try {
            const response = await updateAccountProfile(
                firstname.trim(),
                lastname.trim(),
                profilePassword,
            )
            if (!response.data.user) {
                throw new Error('The server did not return the updated account.')
            }

            setUser(response.data.user)
            setFirstname(response.data.user.firstname)
            setLastname(response.data.user.lastname)
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

    const handleAddPhone = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const normalized = normalizePhoneNumber(newPhoneNumber)

        if (!normalized) {
            setPhoneError(
                'Enter a valid 10-digit PH mobile number starting with 9.',
            )
            return
        }

        setPhoneError('')
        setPhoneStatus('')
        setIsAddingPhone(true)

        try {
            const response = await addAccountPhoneNumber(normalized)
            setUser(response.data.user)
            setNewPhoneNumber('')
            setPhoneStatus(response.data.message)
        } catch (error) {
            setPhoneError(
                apiMessage(error, 'Unable to add this phone number. Please try again.'),
            )
        } finally {
            setIsAddingPhone(false)
        }
    }

    const handleMakePrimary = async (phone: UserPhoneNumber) => {
        setPhoneError('')
        setPhoneStatus('')
        setPhoneBusyId(phone.id)

        try {
            const response = await updateAccountPhoneNumber(phone.id, {
                is_primary: true,
            })
            setUser(response.data.user)
            setPhoneStatus('Primary number updated.')
        } catch (error) {
            setPhoneError(
                apiMessage(error, 'Unable to set the primary number. Please try again.'),
            )
        } finally {
            setPhoneBusyId(null)
        }
    }

    const handleRemovePhone = async (phone: UserPhoneNumber) => {
        if (
            !window.confirm(
                `Remove ${formatPhoneNumber(phone.phone_number)} from your account?`,
            )
        ) {
            return
        }

        setPhoneError('')
        setPhoneStatus('')
        setPhoneBusyId(phone.id)

        try {
            const response = await deleteAccountPhoneNumber(phone.id)
            setUser(response.data.user)
            setPhoneStatus('Phone number removed.')
        } catch (error) {
            setPhoneError(
                apiMessage(error, 'Unable to remove this phone number. Please try again.'),
            )
        } finally {
            setPhoneBusyId(null)
        }
    }

    const requestVerification = async (phone: UserPhoneNumber) => {
        setVerifyError('')
        setVerifyStatus('')
        setDevelopmentCode('')
        setIsSendingCode(true)

        try {
            const response = await sendPhoneNumberVerification(phone.id)
            setVerifyStatus(response.data.message)
            setDevelopmentCode(response.data.development_code ?? '')
        } catch (error) {
            setVerifyError(
                apiMessage(
                    error,
                    'Unable to send the verification email. Please try again.',
                ),
            )
        } finally {
            setIsSendingCode(false)
        }
    }

    const openVerification = (phone: UserPhoneNumber) => {
        setVerifyTarget(phone)
        setVerifyCode('')
        void requestVerification(phone)
    }

    const handleResendCode = () => {
        if (verifyTarget) {
            void requestVerification(verifyTarget)
        }
    }

    const handleVerifyCode = async () => {
        if (!verifyTarget || verifyCode.length !== 6) return

        setVerifyError('')
        setIsVerifyingCode(true)

        try {
            const response = await confirmPhoneNumberVerification(
                verifyTarget.id,
                verifyCode,
            )
            setUser(response.data.user)
            setVerifyTarget(null)
            setVerifyCode('')
            setPhoneStatus('Phone number verified.')
        } catch (error) {
            setVerifyError(
                apiMessage(error, 'Unable to verify this code. Please try again.'),
            )
        } finally {
            setIsVerifyingCode(false)
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
                                    Update the name used for your bookings.
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
                        aria-labelledby="phone-title"
                        className="rounded-2xl bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.08)] sm:p-7"
                    >
                        <div className="mb-5 flex items-start gap-3">
                            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#006dfc]">
                                <Phone className="size-5" aria-hidden="true" />
                            </span>
                            <div>
                                <h2 id="phone-title" className="text-lg font-semibold text-slate-900">
                                    Phone numbers
                                </h2>
                                <p className="mt-1 text-sm leading-5 text-slate-600">
                                    Save the numbers you use for bookings. The primary number
                                    is selected by default during checkout.
                                </p>
                            </div>
                        </div>

                        {phoneNumbers.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                                No phone numbers saved yet. Add one below.
                            </p>
                        ) : (
                            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                {phoneNumbers.map((phone) => (
                                    <li
                                        key={phone.id}
                                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-800">
                                                    {formatPhoneNumber(phone.phone_number)}
                                                </span>
                                                {phone.is_primary && (
                                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#006dfc]">
                                                        Primary
                                                    </span>
                                                )}
                                                {phone.verified_at ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                                        <BadgeCheck className="size-3" aria-hidden="true" />
                                                        Verified
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                                        Not verified
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {!phone.is_primary && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleMakePrimary(phone)}
                                                    disabled={phoneBusyId === phone.id}
                                                    className={smallButton}
                                                >
                                                    <Star className="size-3.5" aria-hidden="true" />
                                                    Make primary
                                                </button>
                                            )}
                                            {!phone.verified_at && (
                                                <button
                                                    type="button"
                                                    onClick={() => openVerification(phone)}
                                                    disabled={phoneBusyId === phone.id}
                                                    className={smallButton}
                                                >
                                                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                                                    Verify
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePhone(phone)}
                                                disabled={phoneBusyId === phone.id}
                                                className={`${smallButton} text-rose-700 hover:border-rose-200 hover:bg-rose-50`}
                                            >
                                                <Trash2 className="size-3.5" aria-hidden="true" />
                                                Remove
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <form
                            onSubmit={handleAddPhone}
                            className="mt-4 flex flex-col gap-2 sm:flex-row"
                        >
                            <label className="block flex-1">
                                <span className="sr-only">New phone number</span>
                                <PhoneNumberInput
                                    value={newPhoneNumber}
                                    onChange={setNewPhoneNumber}
                                    ariaLabel="New phone number"
                                    required
                                    className="min-h-11 rounded-lg"
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={isAddingPhone}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#006dfc] px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                {isAddingPhone ? 'Adding…' : 'Add number'}
                            </button>
                        </form>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                            The +63 prefix is added automatically. Numbers are saved in
                            international format, e.g. +63 917 123 4567.
                        </p>

                        {phoneError && (
                            <p role="alert" className="mt-3 text-sm text-red-700">
                                {phoneError}
                            </p>
                        )}
                        {phoneStatus && (
                            <p role="status" className="mt-3 text-sm text-emerald-700">
                                {phoneStatus}
                            </p>
                        )}
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

            {verifyTarget && (
                <PhoneVerifyModal
                    phoneNumber={formatPhoneNumber(verifyTarget.phone_number)}
                    code={verifyCode}
                    sending={isSendingCode}
                    verifying={isVerifyingCode}
                    error={verifyError}
                    status={verifyStatus}
                    developmentCode={developmentCode}
                    onCodeChange={setVerifyCode}
                    onClose={() => {
                        if (!isSendingCode && !isVerifyingCode) {
                            setVerifyTarget(null)
                        }
                    }}
                    onResend={handleResendCode}
                    onVerify={() => {
                        void handleVerifyCode()
                    }}
                />
            )}
        </main>
    )
}

export default AccountSettings