import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MailCheck, ShieldCheck } from 'lucide-react'
import AccountPasswordInput from '../ui/AccountPasswordInput'
import {
    requestPasswordResetCode,
    resetAccountPassword,
} from '../../../services/accountService'

type RecoveryLocationState = { email?: string } | null

const getErrorMessage = (error: unknown, fallback: string) => {
    if (!axios.isAxiosError(error)) return fallback

    const data = error.response?.data as
        | { message?: string; errors?: Record<string, string[]> }
        | undefined
    const validationMessage = data?.errors
        ? Object.values(data.errors).flat()[0]
        : undefined

    return validationMessage ?? data?.message ?? fallback
}

const PasswordRecovery = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const initialEmail =
        (location.state as RecoveryLocationState)?.email ?? ''
    const [email, setEmail] = useState(initialEmail)
    const [resetId, setResetId] = useState('')
    const [developmentCode, setDevelopmentCode] = useState('')
    const [code, setCode] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [status, setStatus] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const handleRequestCode = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setStatus('')
        setErrorMessage('')
        setIsSubmitting(true)

        try {
            const response = await requestPasswordResetCode(email.trim())
            setResetId(response.data.reset_id)
            setDevelopmentCode(response.data.development_code ?? '')
            setStatus(response.data.message)
        } catch (error) {
            setErrorMessage(
                getErrorMessage(error, 'Unable to request a reset code. Please try again.'),
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setStatus('')
        setErrorMessage('')

        if (newPassword !== passwordConfirmation) {
            setErrorMessage('The new passwords do not match.')
            return
        }

        setIsSubmitting(true)
        try {
            const response = await resetAccountPassword(
                resetId,
                code.trim(),
                newPassword,
                passwordConfirmation,
            )
            setStatus(response.data.message)
            setNewPassword('')
            setPasswordConfirmation('')
        } catch (error) {
            setErrorMessage(
                getErrorMessage(error, 'Unable to reset your password. Please try again.'),
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <main className="grid min-h-svh place-items-center bg-slate-50 px-4 py-12 pt-28 font-poppins sm:px-6 sm:pt-32">
            <section
                aria-labelledby="recovery-title"
                className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.12)] sm:p-8"
            >
                <Link
                    to="/auth?mode=login"
                    className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                >
                    Back to sign in
                </Link>

                <div className="mt-5 flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#006dfc]">
                        {resetId ? (
                            <ShieldCheck className="size-5" aria-hidden="true" />
                        ) : (
                            <MailCheck className="size-5" aria-hidden="true" />
                        )}
                    </span>
                    <div>
                        <h1 id="recovery-title" className="text-2xl font-bold tracking-tight text-slate-900">
                            {resetId ? 'Choose a new password' : 'Reset your password'}
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {resetId
                                ? 'Enter the six-digit code sent to your email and set a new password.'
                                : 'We’ll email you a one-time code to verify your account.'}
                        </p>
                    </div>
                </div>

                {!resetId ? (
                    <form className="mt-7 space-y-5" onSubmit={handleRequestCode}>
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-slate-700">
                                Email address
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                                maxLength={255}
                                autoComplete="email"
                                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/20"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#006dfc] px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-wait disabled:opacity-70"
                        >
                            {isSubmitting ? 'Sending code…' : 'Send reset code'}
                        </button>
                    </form>
                ) : (
                    <form className="mt-7 space-y-5" onSubmit={handleResetPassword}>
                        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            Code sent to <strong className="break-all text-slate-800">{email}</strong>
                        </p>
                        {developmentCode && (
                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                Local development code: <strong>{developmentCode}</strong>
                            </p>
                        )}
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-medium text-slate-700">
                                Six-digit code
                            </span>
                            <input
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="[0-9]{6}"
                                value={code}
                                onChange={(event) =>
                                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                                }
                                required
                                maxLength={6}
                                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base tracking-[0.25em] text-slate-900 outline-none transition-colors focus:border-[#006dfc] focus:ring-2 focus:ring-[#006dfc]/20"
                            />
                        </label>
                        <AccountPasswordInput
                            id="recovery-new-password"
                            label="New password"
                            value={newPassword}
                            onChange={setNewPassword}
                            autoComplete="new-password"
                        />
                        <AccountPasswordInput
                            id="recovery-password-confirmation"
                            label="Confirm new password"
                            value={passwordConfirmation}
                            onChange={setPasswordConfirmation}
                            autoComplete="new-password"
                        />
                        <p className="text-xs leading-5 text-slate-500">
                            The reset code expires in 10 minutes and can be used once.
                        </p>
                        <button
                            type="submit"
                            disabled={isSubmitting || code.length !== 6}
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#006dfc] px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            {isSubmitting ? 'Updating password…' : 'Reset password'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setResetId('')
                                setCode('')
                                setDevelopmentCode('')
                                setNewPassword('')
                                setPasswordConfirmation('')
                                setStatus('')
                                setErrorMessage('')
                            }}
                            className="min-h-11 w-full rounded-lg px-3 text-sm font-medium text-[#006dfc] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                        >
                            Request a new code
                        </button>
                    </form>
                )}

                {errorMessage && (
                    <p role="alert" className="mt-4 text-sm leading-5 text-red-700">
                        {errorMessage}
                    </p>
                )}
                {status && (
                    <p role="status" className="mt-4 text-sm leading-5 text-emerald-800">
                        {status}
                    </p>
                )}
                {status.startsWith('Password reset successfully') && (
                    <button
                        type="button"
                        onClick={() => navigate('/auth?mode=login', { replace: true })}
                        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#006dfc] px-4 text-sm font-semibold text-[#006dfc] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                    >
                        Sign in with your new password
                    </button>
                )}
            </section>
        </main>
    )
}

export default PasswordRecovery
