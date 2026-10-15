import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import axios from 'axios'
import { Loader2, ShieldCheck, X } from 'lucide-react'
import { resendOtp, verifyOtp } from '../../../services/authService'
import type { User } from '../../../services/types'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 30

type VerificationModalProps = {
    email: string
    registrationId: string
    expiresIn: number
    onVerified: (user: User) => void
    onClose: () => void
}

const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const VerificationModal = ({
    email,
    registrationId,
    expiresIn,
    onVerified,
    onClose,
}: VerificationModalProps) => {
    const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [locked, setLocked] = useState(false)
    const [secondsLeft, setSecondsLeft] = useState(expiresIn)
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)

    const inputsRef = useRef<Array<HTMLInputElement | null>>([])

    const otp = digits.join('')
    const isComplete = otp.length === OTP_LENGTH
    const isExpired = secondsLeft <= 0
    const isLocked = locked || isExpired

    useEffect(() => {
        inputsRef.current[0]?.focus()
    }, [])

    useEffect(() => {
        const handleKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
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
        if (isLocked) return
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
        if (isLocked) return
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

        if (!isComplete || isSubmitting || isLocked) return

        setError('')
        setNotice('')
        setIsSubmitting(true)

        try {
            const response = await verifyOtp(registrationId, otp)
            onVerified(response.data.user as User)
        } catch (error) {
            if (!axios.isAxiosError(error) || !error.response) {
                setError('Unable to connect to the server. Please try again.')
            } else {
                const status = error.response.status
                const data = error.response.data as
                    | { message?: string; attempts_remaining?: number }
                    | undefined

                if (status === 422 && typeof data?.attempts_remaining === 'number') {
                    const remaining = data.attempts_remaining
                    setError(
                        `Invalid verification code. ${remaining} ${
                            remaining === 1 ? 'attempt' : 'attempts'
                        } remaining.`,
                    )
                    setDigits(Array(OTP_LENGTH).fill(''))
                    focusInput(0)
                } else if (status === 422) {
                    setError(data?.message || 'This registration has expired. Please register again.')
                    setLocked(true)
                } else if (status === 429) {
                    setError(data?.message || 'Too many incorrect attempts. Please register again.')
                    setLocked(true)
                } else if (status === 409) {
                    setError(data?.message || 'An account with this email already exists. Please log in.')
                    setLocked(true)
                } else {
                    setError(data?.message || 'Something went wrong. Please try again.')
                }
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleResend = async () => {
        if (isResending || cooldown > 0 || isSubmitting) return

        setError('')
        setNotice('')
        setIsResending(true)

        try {
            const response = await resendOtp(registrationId)
            const nextExpiry = Number(response.data?.expires_in) || 600

            setDigits(Array(OTP_LENGTH).fill(''))
            setLocked(false)
            setSecondsLeft(nextExpiry)
            setCooldown(RESEND_COOLDOWN)
            setNotice('A new verification code has been sent to your email.')
            focusInput(0)
        } catch (error) {
            if (!axios.isAxiosError(error) || !error.response) {
                setError('Unable to connect to the server. Please try again.')
            } else {
                const data = error.response.data as { message?: string } | undefined
                setError(data?.message || 'Unable to resend the code. Please try again.')
            }
        } finally {
            setIsResending(false)
        }
    }

    const handleClose = () => {
        if (isSubmitting) return
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
                        We sent a 6-digit verification code to{' '}
                        <span className="font-semibold text-[#172033]">{email}</span>.
                    </p>

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
                                    inputMode="numeric"
                                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                    maxLength={1}
                                    aria-label={`Digit ${index + 1}`}
                                    disabled={isLocked}
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

                        {isLocked ? (
                            <button
                                type="button"
                                onClick={handleClose}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#006dfc] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(0,109,252,0.25)] transition duration-200 hover:bg-[#0056cc] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006dfc] focus-visible:ring-offset-2"
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

                    {!isLocked && (
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
