import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import axios from 'axios'
import { Loader2, ShieldCheck, X } from 'lucide-react'
import { authErrorMessage } from '../../../services/authErrors'
import { resendOtp, verifyOtp } from '../../../services/authService'
import type { User } from '../../../services/types'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 30

type VerificationErrorData = {
    code?: string
    message?: string
    attempts_remaining?: number
    errors?: Record<string, string[]>
}

type VerificationModalProps = {
    email: string
    registrationId: string
    expiresAt: number
    delivery: 'email' | 'log'
    developmentCode: string | null
    remember: boolean
    onVerified: (user: User, token: string, expiresAt: string | undefined) => void
    onExistingAccount: (email: string) => void
    onVerificationUpdated: (expiresAt: number, developmentCode: string | null) => void
    onInvalidated: (message: string) => void
    onClose: () => void
}

const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const headerValue = (headers: unknown, name: string): string | undefined => {
    if (!headers || typeof headers !== 'object') return undefined

    const withGet = headers as { get?: (key: string) => string | undefined }
    if (typeof withGet.get === 'function') {
        return withGet.get.call(headers, name)
    }

    const record = headers as Record<string, unknown>
    const key = Object.keys(record).find((candidate) => candidate.toLowerCase() === name.toLowerCase())
    if (!key) return undefined

    const value = record[key]
    if (Array.isArray(value)) return String(value[0] ?? '')
    return value === undefined ? undefined : String(value)
}

const VerificationModal = ({
    email,
    registrationId,
    expiresAt,
    delivery,
    developmentCode: initialDevelopmentCode,
    remember,
    onVerified,
    onExistingAccount,
    onVerificationUpdated,
    onInvalidated,
    onClose,
}: VerificationModalProps) => {
    const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)))
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
    const [developmentCode, setDevelopmentCode] = useState(initialDevelopmentCode)

    const inputsRef = useRef<Array<HTMLInputElement | null>>([])
    const submittingRef = useRef(false)
    const resendingRef = useRef(false)

    const otp = digits.join('')
    const isComplete = otp.length === OTP_LENGTH
    const isExpired = secondsLeft <= 0

    useEffect(() => {
        inputsRef.current[0]?.focus()
    }, [])

    useEffect(() => {
        const handleKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape' && !submittingRef.current) onClose()
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    useEffect(() => {
        if (secondsLeft <= 0) return

        const timer = window.setInterval(() => {
            setSecondsLeft((current) => (current <= 1 ? 0 : current - 1))
        }, 1000)

        return () => window.clearInterval(timer)
    }, [secondsLeft])

    useEffect(() => {
        if (cooldown <= 0) return

        const timer = window.setInterval(() => {
            setCooldown((current) => (current <= 1 ? 0 : current - 1))
        }, 1000)

        return () => window.clearInterval(timer)
    }, [cooldown])

    const focusInput = (index: number) => {
        inputsRef.current[index]?.focus()
    }

    const handleChange = (index: number, raw: string) => {
        if (isExpired) return
        setError('')
        setNotice('')

        const value = raw.replace(/\D/g, '')

        if (!value) {
            setDigits((current) => {
                const next = [...current]
                next[index] = ''
                return next
            })
            return
        }

        const chars = value.split('')

        setDigits((current) => {
            const next = [...current]
            for (let i = 0; i < chars.length && index + i < OTP_LENGTH; i += 1) {
                next[index + i] = chars[i]
            }
            return next
        })

        focusInput(Math.min(index + chars.length, OTP_LENGTH - 1))
    }

    const handleKeyDownInput = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace') {
            if (digits[index]) {
                event.preventDefault()
                setDigits((current) => {
                    const next = [...current]
                    next[index] = ''
                    return next
                })
            } else if (index > 0) {
                event.preventDefault()
                setDigits((current) => {
                    const next = [...current]
                    next[index - 1] = ''
                    return next
                })
                focusInput(index - 1)
            }
            return
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault()
            focusInput(index - 1)
        } else if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
            event.preventDefault()
            focusInput(index + 1)
        }
    }

    const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
        if (isExpired) return
        event.preventDefault()

        const text = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
        if (!text) return

        setError('')
        setNotice('')

        const chars = text.split('')

        setDigits(() => {
            const next = Array(OTP_LENGTH).fill('')
            for (let i = 0; i < chars.length; i += 1) {
                next[i] = chars[i]
            }
            return next
        })

        focusInput(Math.min(chars.length, OTP_LENGTH - 1))
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!isComplete || submittingRef.current || isExpired) return

        submittingRef.current = true
        setError('')
        setNotice('')
        setIsSubmitting(true)
        let completed = false

        try {
            const response = await verifyOtp(registrationId, otp, remember)
            const user = response.data?.user as User | undefined
            const token = response.data?.token
            const tokenExpiresAt = typeof response.data?.expires_at === 'string'
                ? response.data.expires_at
                : undefined

            if (!user?.id || typeof token !== 'string' || !token) {
                setError('Verification did not return your account. Please try again.')
                return
            }

            completed = true
            onVerified(user, token, tokenExpiresAt)
        } catch (error) {
            if (!axios.isAxiosError(error) || !error.response) {
                setError('Unable to connect to the server. Please try again.')
            } else {
                const status = error.response.status
                const data = error.response.data as VerificationErrorData | undefined
                const message = authErrorMessage(error)

                if (status === 409) {
                    onExistingAccount(email)
                } else if (status === 422 && data?.code === 'registration_expired') {
                    onInvalidated(message)
                } else if (status === 429 && data?.code === 'too_many_attempts') {
                    onInvalidated(message)
                } else if (status === 422 && (data?.code === 'invalid_otp' || typeof data?.attempts_remaining === 'number')) {
                    const remaining = data?.attempts_remaining
                    setError(
                        typeof remaining === 'number'
                            ? `Invalid verification code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`
                            : 'Invalid verification code.',
                    )
                    setDigits(Array(OTP_LENGTH).fill(''))
                    focusInput(0)
                } else if (status === 429) {
                    const retryAfter = Number(headerValue(error.response.headers, 'retry-after')) || 30
                    setCooldown((current) => Math.max(current, retryAfter))
                    setError(`${message} Retry in ${retryAfter}s.`)
                } else if ([500, 502, 503, 504].includes(status)) {
                    setError('The server is temporarily unavailable. Please try again.')
                } else {
                    setError(message)
                }
            }
        } finally {
            submittingRef.current = false
            if (!completed) setIsSubmitting(false)
        }
    }

    const handleResend = async () => {
        if (resendingRef.current || cooldown > 0 || submittingRef.current || isExpired) return

        resendingRef.current = true
        setError('')
        setNotice('')
        setIsResending(true)

        try {
            const response = await resendOtp(registrationId)
            const nextExpiry = Number(response.data?.expires_in) || 600
            const responseExpiresAt = Date.parse(response.data?.expires_at)
            const nextDevelopmentCode = typeof response.data?.development_code === 'string'
                ? response.data.development_code
                : null

            if (!Number.isFinite(responseExpiresAt)) {
                setError('The server did not return a valid expiry. Please try again.')
                return
            }

            onVerificationUpdated(responseExpiresAt, nextDevelopmentCode)
            setDigits(Array(OTP_LENGTH).fill(''))
            setSecondsLeft(nextExpiry)
            setCooldown(RESEND_COOLDOWN)
            setDevelopmentCode(nextDevelopmentCode)
            setNotice(
                delivery === 'log'
                    ? nextDevelopmentCode
                        ? 'A new development code is ready above.'
                        : 'A new verification code was written to the local application log.'
                    : 'A new verification code has been sent.',
            )
            focusInput(0)
        } catch (error) {
            if (!axios.isAxiosError(error) || !error.response) {
                setError('Unable to connect to the server. Please try again.')
            } else {
                const status = error.response.status
                const data = error.response.data as VerificationErrorData | undefined
                const message = authErrorMessage(error)

                if (status === 409) {
                    onExistingAccount(email)
                } else if (status === 422 && data?.code === 'registration_expired') {
                    onInvalidated(message)
                } else if (status === 429) {
                    const retryAfter = Number(headerValue(error.response.headers, 'retry-after')) || 30
                    setCooldown((current) => Math.max(current, retryAfter))
                    setError(`${message} Retry in ${retryAfter}s.`)
                } else if ([500, 502, 503, 504].includes(status)) {
                    setError('The server is temporarily unavailable. Please try again.')
                } else {
                    setError(message)
                }
            }
        } finally {
            resendingRef.current = false
            setIsResending(false)
        }
    }

    const handleClose = () => {
        if (submittingRef.current || resendingRef.current) return
        onClose()
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/60 p-4 backdrop-blur-[6px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="verification-title"
            aria-describedby="verification-description"
        >
            <button
                type="button"
                aria-label="Close dialog"
                onClick={handleClose}
                className="absolute inset-0 h-full w-full cursor-default"
            />

            <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
                <div className="h-1.5 w-full bg-linear-to-r from-[#006dfc] via-[#3987f5] to-[#006dfc]" />

                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close verification"
                    className="absolute right-4 top-5 z-10 flex size-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-[#172033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006dfc]/40"
                >
                    <X className="size-4.5" />
                </button>

                <div className="px-7 pb-8 pt-7 text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#006dfc]/10 text-[#006dfc]">
                        <ShieldCheck className="size-7" />
                    </div>

                    <h2
                        id="verification-title"
                        className="mt-5 text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-[#172033]"
                    >
                        Verify your email
                    </h2>

                    <p
                        id="verification-description"
                        className="mx-auto mt-2 max-w-xs text-[13px] leading-[1.7] text-gray-500"
                    >
                        {delivery === 'log' ? (
                            <>
                                {developmentCode
                                    ? 'This code is for local development. It was not sent by email.'
                                    : 'Check the local application log for your code. It was not sent by email.'}
                            </>
                        ) : (
                            <>
                                We sent a 6-digit verification code to{' '}
                                <span className="font-semibold text-[#172033]">{email}</span>.
                            </>
                        )}
                    </p>

                    {delivery === 'log' && developmentCode && (
                        <div className="mx-auto mt-4 flex max-w-xs items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                            <div className="text-left">
                                <span className="block text-[10px] font-medium uppercase tracking-wide text-blue-700">
                                    Development code
                                </span>
                                <code className="text-lg font-bold tracking-[0.3em] text-[#172033]">
                                    {developmentCode}
                                </code>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setDigits(developmentCode.split(''))
                                    setError('')
                                    setNotice('')
                                    focusInput(OTP_LENGTH - 1)
                                }}
                                className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#006dfc] shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-100"
                            >
                                Use code
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-6">
                        <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
                            {digits.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(element) => {
                                        inputsRef.current[index] = element
                                    }}
                                    value={digit}
                                    onChange={(event) => handleChange(index, event.target.value)}
                                    onKeyDown={(event) => handleKeyDownInput(index, event)}
                                    onFocus={(event) => event.currentTarget.select()}
                                    inputMode="numeric"
                                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                    maxLength={1}
                                    aria-label={`Digit ${index + 1}`}
                                    disabled={isExpired}
                                    className="h-13 w-11 rounded-xl border border-gray-200 bg-white text-center text-lg font-semibold text-[#172033] shadow-sm transition focus:border-[#006dfc] focus:outline-none focus:ring-2 focus:ring-[#006dfc]/30 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 sm:w-12"
                                />
                            ))}
                        </div>

                        <p className="mt-3 text-xs text-gray-400">
                            {isExpired
                                ? 'Code expired'
                                : `Code expires in ${formatTime(secondsLeft)}`}
                        </p>

                        <div className="mt-3 min-h-5" aria-live="polite">
                            {error ? (
                                <p role="alert" className="text-[13px] font-medium text-red-600">
                                    {error}
                                </p>
                            ) : isExpired ? (
                                <p role="alert" className="text-[13px] font-medium text-red-600">
                                    Your verification code has expired. Please register again.
                                </p>
                            ) : notice ? (
                                <p role="status" className="text-[13px] font-medium text-green-700">
                                    {notice}
                                </p>
                            ) : null}
                        </div>

                        {isExpired ? (
                            <button
                                type="button"
                                onClick={() => onInvalidated('Your verification code has expired. Please register again.')}
                                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                            >
                                Back to registration
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!isComplete || isSubmitting}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#006dfc] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(0,109,252,0.25)] transition duration-200 hover:bg-[#0056cc] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006dfc] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                                {isSubmitting ? 'VERIFYING...' : 'VERIFY & CREATE ACCOUNT'}
                            </button>
                        )}
                    </form>

                    {!isExpired && (
                        <p className="mt-5 text-center text-[13px] text-gray-500">
                            Didn&apos;t get the code?{' '}
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={isResending || cooldown > 0}
                                className="font-semibold text-[#006dfc] transition hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                            >
                                {isResending
                                    ? 'Sending...'
                                    : cooldown > 0
                                        ? `Resend in ${cooldown}s`
                                        : 'Resend code'}
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default VerificationModal
