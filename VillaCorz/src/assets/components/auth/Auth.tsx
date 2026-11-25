import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../services/useAuth'
import { authErrorMessage } from '../../../services/authErrors'
import { getPostAuthDestination } from '../../../services/authRouting'
import {
    clearPendingVerification,
    loadPendingVerification,
    savePendingVerification,
    type PendingVerification,
} from '../../../services/pendingVerification'
import { setAuthToken } from '../../../services/api'
import type { User } from '../../../services/types'
import { Mail } from 'lucide-react'
import { login, normalizeEmail, register } from '../../../services/authService'
import PasswordField from '../ui/FormComponents/PasswordField'
import InputField from '../ui/FormComponents/InputField'
import VerificationModal from './VerificationModal'

type AuthMode = 'login' | 'register'

type FormProps = {
    onSwitch: () => void
    onSubmit: (event: FormEvent<HTMLFormElement>) => void
    isSubmitting: boolean
    feedback: string
    feedbackType: 'success' | 'error'
    remember: boolean
    pendingVerification?: PendingVerification | null
    onResumeVerification?: () => void
}

const RememberMeField = ({ checked }: { checked: boolean }) => (
    <label className="flex items-center gap-2 text-sm text-[#333333]">
        <input
            type="checkbox"
            name="remember"
            defaultChecked={checked}
            className="size-4 accent-[#0866e8]"
        />
        Keep me signed in on this device
    </label>
)

const logo =
    'https://res.cloudinary.com/ql4hruc3/image/upload/v1791786033/VillaCorzLogo.png'

const collageImage =
    'https://res.cloudinary.com/ql4hruc3/image/upload/v1791785313/CenterCollage.png'

const footerImage =
    'https://res.cloudinary.com/ql4hruc3/image/upload/v1791785594/footer.png'

const AuthLeftPanel = () => (
    <aside className="relative hidden min-h-[max(100svh,40rem)] w-[55%] flex-none overflow-hidden bg-white lg:block">
        <img
            src={logo}
            alt="VillaCorz logo"
            className="absolute left-5 top-5 z-30 size-25 rounded-full object-contain"
        />

        <img
            src={collageImage}
            alt="VillaCorz beach getaway photo collage"
            className="absolute left-[-33%] top-[-7%] z-10 h-full w-[158%] max-w-none object-contain object-top"
        />

        <div className="absolute bottom-[16%] left-[3%] z-20 w-[52%] text-[#111111]">
            <h1 className="text-[clamp(1.6rem,3.2vw,3rem)] font-extrabold leading-[0.95] tracking-tight">
                YOUR
                <br />
                <span className="text-[#3987f5]">PERFECT</span>
                <br />
                GETAWAY
                <br />
                BY THE <span className="text-[#3987f5]">SEA.</span>
            </h1>

            <p className="mt-2 text-[clamp(0.55rem,0.85vw,0.8rem)] leading-tight">
                Gather. Celebrate. Create memories.
            </p>
        </div>

        <img
            src={footerImage}
            alt=""
            aria-hidden="true"
            className="absolute bottom-0 left-0 z-20 h-[12%] w-full object-fill"
        />
    </aside>
)

const FormLogin = ({
    onSwitch,
    onForgot,
    onSubmit,
    isSubmitting,
    feedback,
    feedbackType,
    remember,
    initialEmail,
}: FormProps & { onForgot: () => void; initialEmail?: string }) => (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-6 sm:gap-8">
        <header className="flex w-full flex-col items-start gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#5571ff] sm:text-[2.7rem]">
                Welcome back.
            </h1>

            <p className="text-sm text-[#222222]">
                Log in to manage your stay at Villa Corz.
            </p>
        </header>

        <div className="flex w-full flex-col gap-5">
            <InputField
                id="loginEmail"
                name="email"
                label="E-mail"
                type="email"
                autoComplete="email"
                defaultValue={initialEmail}
                icon={<Mail className="size-5" />}
            />

            <PasswordField
                id="loginPassword"
                name="password"
                label="Password"
                autoComplete="current-password"
            />

            <RememberMeField checked={remember} />

            <p
                role={feedbackType === 'error' ? 'alert' : 'status'}
                className={`pb-2 min-h-8 text-sm ${feedbackType === 'success'
                    ? 'text-green-800'
                    : 'text-red-700'
                    }`}
            >
                {feedback}
            </p>

            <button
                type="button"
                onClick={onForgot}
                className="self-end text-sm text-gray-500 transition hover:text-[#0866e8]"
            >
                Forgot password?
            </button>
        </div>

        <div className="flex w-full flex-col gap-4">
            <button
                type="submit"
                className="auth-submit"
                disabled={isSubmitting}>
                {isSubmitting ? 'LOGGING IN' : 'LOGIN'}
            </button>

            <p className="text-center text-xs text-[#333333]">
                New to Villa Corz?{' '}
                <button
                    type="button"
                    onClick={onSwitch}
                    className="font-semibold text-[#0866e8] hover:underline"
                >
                    Create an account
                </button>
            </p>
        </div>
    </form>
)

const FormRegister = ({ onSwitch, onSubmit, isSubmitting, feedback, feedbackType, remember, pendingVerification, onResumeVerification }: FormProps) => (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-5 sm:gap-6">
        <header className="flex w-full flex-col items-start gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#5571ff] sm:text-[2.7rem]">
                Create your account.
            </h1>

            <p className="text-sm text-[#222222]">
                Book rooms and plan your beach getaway.
            </p>
        </header>

        <div className="flex w-full flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                    id="registerFirstName"
                    name="firstName"
                    label="First Name"
                    autoComplete="given-name"
                />

                <InputField
                    id="registerLastName"
                    name="lastName"
                    label="Last Name"
                    autoComplete="family-name"
                />
            </div>

            <InputField
                id="registerEmail"
                name="email"
                label="Email Address"
                type="email"
                autoComplete="email"
                icon={<Mail className="size-5" />}
            />

            <PasswordField
                id="registerPassword"
                name="password"
                label="Password"
                autoComplete="new-password"
            />

            <PasswordField
                id="passwordConfirm"
                name="passwordConfirm"
                label="Confirm Password"
                autoComplete="new-password"
            />

            <RememberMeField checked={remember} />
        </div>

        <p
            role={feedbackType === 'error' ? 'alert' : 'status'}
            className={`pb-2 min-h-8 text-sm ${feedbackType === 'success'
                ? 'text-green-800'
                : 'text-red-700'
                }`}
        >
            {feedback}
        </p>

        {pendingVerification && (
            <button
                type="button"
                onClick={onResumeVerification}
                className="w-full rounded-xl border border-[#006dfc]/25 bg-[#006dfc]/5 px-4 py-3 text-left text-sm text-[#172033] transition hover:bg-[#006dfc]/10"
            >
                <span className="font-semibold text-[#006dfc]">Continue email verification</span>
                <span className="block text-xs text-gray-500">{pendingVerification.email}</span>
            </button>
        )}

        <div className="flex w-full flex-col gap-4">
            <button
                type="submit"
                className="auth-submit"
                disabled={isSubmitting}>
                {isSubmitting ? 'CREATING ACCOUNT' : 'CREATE ACCOUNT'}
            </button>

            <p className="text-center text-xs text-[#333333]">
                Already have an account?{' '}
                <button
                    type="button"
                    onClick={onSwitch}
                    className="font-semibold text-[#0866e8] hover:underline"
                >
                    Log in
                </button>
            </p>
        </div>
    </form>
)

const Auth = () => {
    const navigate = useNavigate();
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()
    const { setUser } = useAuth()

    const mode: AuthMode =
        searchParams.get('mode') === 'register' ? 'register' : 'login'

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loginEmail, setLoginEmail] = useState('')
    const [feedback, setFeedback] = useState('')
    const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('error')
    const [verification, setVerification] = useState<PendingVerification | null>(
        () => loadPendingVerification(),
    )
    const [remember, setRemember] = useState(() => verification?.remember ?? false)

    const isRegistering = mode === 'register'
    const storedVerification = isRegistering && !verification ? loadPendingVerification() : null

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFeedback('')

        const form = event.currentTarget
        const formData = new FormData(form)
        const email = normalizeEmail(String(formData.get('email') || ''))
        const password = String(formData.get('password') || '')
        const keepSignedIn = formData.get('remember') === 'on'
        setRemember(keepSignedIn)

        setIsSubmitting(true)

        try {
            if (mode === 'login') {
                const response = await login(email, password, keepSignedIn)
                const authenticatedUser = response.data?.user as User | undefined

                setUser(authenticatedUser ?? null)
                navigate(
                    getPostAuthDestination(authenticatedUser, location.state),
                    { replace: true },
                )
                return
            }

            const firstname = String(formData.get('firstName') || '').trim()
            const lastname = String(formData.get('lastName') || '').trim()
            const passwordConfirm = String(formData.get('passwordConfirm') || '')

            if (password !== passwordConfirm) {
                setFeedback('Passwords do not match.')
                setFeedbackType('error')
                return
            }

            const response = await register(firstname, lastname, email, password)
            const payload = response.data as {
                code?: string
                message?: string
                registration_id?: string
                expires_at?: string
                verification_delivery?: string
                development_code?: string
            } | undefined
            const registrationId = payload?.registration_id

            if (typeof registrationId !== 'string' || !registrationId) {
                throw new Error(payload?.message || 'Registration did not return a verification ID. Please try again.')
            }

            const expiresAt = Date.parse(payload?.expires_at ?? '')
            if (!Number.isFinite(expiresAt)) {
                throw new Error('Registration did not return a valid expiry. Please try again.')
            }

            const pending: PendingVerification = {
                registrationId,
                email,
                expiresAt,
                delivery: payload?.verification_delivery === 'log' ? 'log' : 'email',
                developmentCode:
                    typeof payload?.development_code === 'string'
                        ? payload.development_code
                        : null,
                remember: keepSignedIn,
            }

            savePendingVerification(pending)
            setFeedback('')
            setVerification(pending)

        } catch (error) {
            setFeedback(authErrorMessage(error))
            setFeedbackType('error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const switchForm = () => {
        setSearchParams({
            mode: mode === 'login' ? 'register' : 'login',
        })
        setLoginEmail('')
        setFeedback('')
    }

    return (
        <main className="flex min-h-screen flex-col lg:flex-row">
            <AuthLeftPanel />

            <section className="flex min-h-screen w-full min-w-0 items-center justify-center bg-[#f7f7f7] px-5 py-10 sm:px-8 lg:w-[45%] lg:flex-none lg:px-8">
                <div
                    key={mode}
                    className={`w-full max-w-107.5 ${isRegistering
                        ? 'auth-fade-in-right'
                        : 'auth-fade-in-left'
                        }`}
                >
                    {isRegistering ? (
                        <FormRegister
                            onSwitch={switchForm}
                            onSubmit={handleSubmit}
                            isSubmitting={isSubmitting}
                            feedback={feedback}
                            feedbackType={feedbackType}
                            remember={remember}
                            pendingVerification={storedVerification}
                            onResumeVerification={() => {
                                if (storedVerification) setVerification(storedVerification)
                            }}
                        />
                    ) : (
                        <FormLogin
                            onSwitch={switchForm}
                            onForgot={() => navigate('/forgot-password')}
                            initialEmail={loginEmail}
                            onSubmit={handleSubmit}
                            isSubmitting={isSubmitting}
                            feedback={feedback}
                            feedbackType={feedbackType}
                            remember={remember}
                        />
                    )}
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="w-full text-sm text-gray-500 transition hover:text-[#0866e8]"
                    >
                        Continue browsing without an account
                    </button>
                </div>
            </section>

            {verification && isRegistering && (
                <VerificationModal
                    email={verification.email}
                    registrationId={verification.registrationId}
                    expiresAt={verification.expiresAt}
                    delivery={verification.delivery}
                    developmentCode={verification.developmentCode}
                    remember={verification.remember}
                    onVerified={(user, token, tokenExpiresAt) => {
                        clearPendingVerification()
                        setAuthToken(token, verification.remember, tokenExpiresAt)
                        setUser(user)
                        setVerification(null)
                        navigate(getPostAuthDestination(user, location.state), { replace: true })
                    }}
                    onExistingAccount={(existingEmail) => {
                        clearPendingVerification()
                        setLoginEmail(existingEmail)
                        setVerification(null)
                        setSearchParams({ mode: 'login' })
                        setFeedback('An account with this email already exists. Please log in.')
                        setFeedbackType('error')
                    }}
                    onVerificationUpdated={(expiresAt, developmentCode) => {
                        setVerification((current) => current
                            ? {
                                ...current,
                                expiresAt,
                                developmentCode,
                            }
                            : current)
                    }}
                    onInvalidated={(message) => {
                        clearPendingVerification()
                        setVerification(null)
                        setFeedback(message)
                        setFeedbackType('error')
                    }}
                    onClose={() => setVerification(null)}
                />
            )}
        </main>
    )
}

export default Auth
