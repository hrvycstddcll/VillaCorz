import { useState, type FormEvent, type ReactNode } from 'react'
import { Eye, EyeOff, Mail } from 'lucide-react'

type AuthMode = 'login' | 'register'

type FormProps = {
    onSwitch: () => void
    onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

type InputFieldProps = {
    id: string
    name: string
    label: string
    type?: 'text' | 'email'
    autoComplete: string
    maxLength?: number
    icon?: ReactNode
}

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

const InputField = ({
    id,
    name,
    label,
    type = 'text',
    autoComplete,
    maxLength = 55,
    icon,
}: InputFieldProps) => (
    <div className="input-float w-full">
        <input
            id={id}
            name={name}
            type={type}
            placeholder=" "
            required
            maxLength={maxLength}
            autoComplete={autoComplete}
            className={`input-focus ${icon ? 'pr-12' : ''}`}
        />

        <label className="input-float-label" htmlFor={id}>
            {label}
        </label>

        {icon && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#333333]">
                {icon}
            </span>
        )}
    </div>
)

const PasswordField = ({
    id,
    name,
    label,
    autoComplete,
}: {
    id: string
    name: string
    label: string
    autoComplete: string
}) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="input-float w-full">
            <input
                id={id}
                name={name}
                type={showPassword ? 'text' : 'password'}
                placeholder=" "
                required
                maxLength={20}
                autoComplete={autoComplete}
                className="input-focus pr-12"
            />

            <label className="input-float-label" htmlFor={id}>
                {label}
            </label>

            <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] transition hover:text-[#0866e8]"
            >
                {showPassword ? (
                    <EyeOff className="size-5" />
                ) : (
                    <Eye className="size-5" />
                )}
            </button>
        </div>
    )
}

const FormLogin = ({ onSwitch, onSubmit }: FormProps) => (
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
                icon={<Mail className="size-5" />}
            />

            <PasswordField
                id="loginPassword"
                name="password"
                label="Password"
                autoComplete="current-password"
            />

            <button
                type="button"
                className="self-end text-sm text-gray-500 transition hover:text-[#0866e8]"
            >
                Forgot password?
            </button>
        </div>

        <div className="flex w-full flex-col gap-4">
            <button type="submit" className="auth-submit">
                LOGIN
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

const FormRegister = ({ onSwitch, onSubmit }: FormProps) => (
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
        </div>

        <div className="flex w-full flex-col gap-4">
            <button type="submit" className="auth-submit">
                CREATE ACCOUNT
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
    const [mode, setMode] = useState<AuthMode>('login')

    const isRegistering = mode === 'register'

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
    }

    const switchForm = () => {
        setMode((currentMode) =>
            currentMode === 'login' ? 'register' : 'login',
        )
    }

    return (
        <main className="flex min-h-screen flex-col lg:flex-row">
            <AuthLeftPanel />

            <section className="flex min-h-screen w-full min-w-0 items-center justify-center bg-[#f7f7f7] px-5 py-10 sm:px-8 lg:w-[45%] lg:flex-none lg:px-8">
                <div
                    key={mode}
                    className={`w-full max-w-[430px] ${
                        isRegistering
                            ? 'auth-fade-in-right'
                            : 'auth-fade-in-left'
                    }`}
                >
                    {isRegistering ? (
                        <FormRegister
                            onSwitch={switchForm}
                            onSubmit={handleSubmit}
                        />
                    ) : (
                        <FormLogin
                            onSwitch={switchForm}
                            onSubmit={handleSubmit}
                        />
                    )}
                </div>
            </section>
        </main>
    )
}

export default Auth
