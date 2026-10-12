import { useState, type FormEvent } from 'react'

type AuthMode = 'login' | 'register'

const logo =
    'https://res.cloudinary.com/ql4hruc3/image/upload/v1791786033/VillaCorzLogo.png'
const collageImage =
    'https://res.cloudinary.com/ql4hruc3/image/upload/v1791785313/CenterCollage.png'
const footerImage =
    'https://res.cloudinary.com/ql4hruc3/image/upload/v1791785594/footer.png'


const AuthLeftPanel = () => (
    <aside className="relative hidden h-screen min-h-screen w-[55%] flex-none overflow-hidden bg-white lg:block">
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

const hide = () => (
    <svg
        className="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
    >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.3 3.3" />
        <path d="M6.2 6.2C3.8 7.6 2.4 10 2 12c1 2.5 4.5 7 10 7 1.1 0 2.1-.2 3-.5" />
    </svg>
)

const unhide = () => (
    <svg
        className="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
    >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
)

const mail = () => (
    <svg
        className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-[#333333]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
    >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
    </svg>
)

const Auth = () => {
    const [mode, setMode] = useState<AuthMode>('login')
    const [showPassword, setShowPassword] = useState(false)
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
    const isRegistering = mode === 'register'

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
    }

    return (
        <main className="flex min-h-screen flex-col lg:flex-row">
            <AuthLeftPanel />
            <section className="flex min-h-screen w-full min-w-0 items-center justify-center bg-[#f7f7f7] px-5 py-10 sm:px-8 lg:w-[45%] lg:flex-none lg:px-8">
                <div
                    key={mode}
                    className={`w-full max-w-[430px] ${isRegistering ? 'auth-slide-from-right' : 'auth-slide-from-left'
                        }`}
                >
                    <header className="mb-7">
                        <h1 className="text-3xl font-extrabold tracking-tight text-[#5571ff] sm:text-[2.7rem]">
                            {isRegistering ? 'Create your account.' : 'Welcome back.'}
                        </h1>
                        <p className="mt-2 text-sm text-[#222222]">
                            {isRegistering
                                ? 'Book rooms and plan your beach getaway.'
                                : 'Log in to manage your stay at Villa Corz.'}
                        </p>
                    </header>
                    
                    {/* Register Form */}
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {isRegistering && (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="relative min-w-0">
                                    <input
                                        id="firstName"
                                        autoComplete="given-name"
                                        className="peer h-12 w-full rounded-md border border-[#777777] bg-transparent px-3 text-sm outline-none transition-colors duration-200 hover:border-[#3987f5] focus:border-[#0866e8] focus:ring-2 focus:ring-blue-100"
                                        name="firstName"
                                        placeholder=" "
                                        required
                                    />
                                    <label
                                        htmlFor="firstName"
                                        className="absolute left-3 top-0 -translate-y-1/2 bg-[#f7f7f7] px-1 text-[11px] text-[#222222] transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-0 peer-focus:text-[11px]"
                                    >
                                        First Name
                                    </label>
                                </div>

                                <div className="relative min-w-0">
                                    <input
                                        id="lastName"
                                        autoComplete="family-name"
                                        className="peer h-12 w-full rounded-md border border-[#777777] bg-transparent px-3 text-sm outline-none transition-colors duration-200 hover:border-[#3987f5] focus:border-[#0866e8] focus:ring-2 focus:ring-blue-100"
                                        name="lastName"
                                        placeholder=" "
                                        required
                                    />
                                    <label
                                        htmlFor="lastName"
                                        className="absolute left-3 top-0 -translate-y-1/2 bg-[#f7f7f7] px-1 text-[11px] text-[#222222] transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-0 peer-focus:text-[11px]"
                                    >
                                        Last Name
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Login Form */}
                        <div className="relative">
                            <input
                                id="email"
                                autoComplete="email"
                                className="peer h-12 w-full rounded-md border border-[#777777] bg-transparent px-3 pr-10 text-sm outline-none transition-colors duration-200 hover:border-[#3987f5] focus:border-[#0866e8] focus:ring-2 focus:ring-blue-100"
                                name="email"
                                placeholder=" "
                                required
                                type="email"
                            />
                            <label
                                htmlFor="email"
                                className="absolute left-3 top-0 -translate-y-1/2 bg-[#f7f7f7] px-1 text-[11px] text-[#222222] transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-0 peer-focus:text-[11px]"
                            >
                                Email Address
                            </label>
                            {mail()}
                        </div>

                        <div className="relative">
                            <input
                                id="password"
                                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                                className="peer h-12 w-full rounded-md border border-[#777777] bg-transparent px-3 pr-10 text-sm outline-none transition-colors duration-200 hover:border-[#3987f5] focus:border-[#0866e8] focus:ring-2 focus:ring-blue-100"
                                name="password"
                                placeholder=" "
                                required
                                type={showPassword ? 'text' : 'password'}
                            />
                            <label
                                htmlFor="password"
                                className="absolute left-3 top-0 -translate-y-1/2 bg-[#f7f7f7] px-1 text-[11px] text-[#222222] transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-0 peer-focus:text-[11px]"
                            >
                                Password
                            </label>
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555]"
                                onClick={() => setShowPassword(!showPassword)}
                                type="button"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? hide() : unhide()}
                            </button>
                        </div>

                        {isRegistering && (
                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    autoComplete="new-password"
                                    className="peer h-12 w-full rounded-md border border-[#777777] bg-transparent px-3 text-sm outline-none transition-colors duration-200 hover:border-[#3987f5] focus:border-[#0866e8] focus:ring-2 focus:ring-blue-100"
                                    name="confirmPassword"
                                    placeholder=" "
                                    required
                                    type={showPasswordConfirm ? 'text' : 'password'}
                                />
                                <label
                                    htmlFor="confirmPassword"
                                    className="absolute left-3 top-0 -translate-y-1/2 bg-[#f7f7f7] px-1 text-[11px] text-[#222222] transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-0 peer-focus:text-[11px]"
                                >
                                    Confirm Password
                                </label>
                                <button
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555]"
                                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                    type="button"
                                    aria-label={showPasswordConfirm ? 'Hide password' : 'Show password'}
                                >
                                    {showPasswordConfirm ? hide() : unhide()}
                                </button>
                            </div>
                        )}

                        {!isRegistering && (
                            <p className="min-h-4 px-1 text-xs text-red-500">
                                Email or password must be incorrect.
                            </p>
                        )}

                        <button
                            className="mt-1 h-12 w-full rounded-lg bg-[#0866e8] text-sm font-bold text-white shadow-lg transition hover:bg-[#0757c7] focus:outline-none focus:ring-4 focus:ring-blue-200"
                            type="submit"
                        >
                            {isRegistering ? 'CREATE ACCOUNT' : 'LOGIN'}
                        </button>
                    </form>

                    <p className="mt-5 text-center text-xs text-[#333333]">
                        {isRegistering ? 'Already have an account?' : 'New to Villa Corz?'}{' '}
                        <button
                            className="text-[#0866e8] hover:underline"
                            onClick={() => setMode(isRegistering ? 'login' : 'register')}
                            type="button"
                        >
                            {isRegistering ? 'Log in' : 'Create an account'}
                        </button>
                    </p>
                </div>
            </section>
        </main>
    )
}

export default Auth
