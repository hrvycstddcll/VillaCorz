import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from 'react'
import { useNavigate } from 'react-router-dom'
import logoSvg from '../../VillaCorz-SVGLogo.svg?raw'
import { Menu, X } from 'lucide-react'
import DirectionalButton from './DirectionalButton'
import GooeyNav, { type GooeyNavItem } from './GooeyNav'
import { useAuth } from '../../../services/AuthContext'
import LogoutModal from './LogoutModal'

const triangleColor = '#000000'
const textColor = '#000000'
const buttonColor = '#3d8bff'

const logoMarkup = logoSvg
    .replaceAll('#4075b6', triangleColor)
    .replaceAll('#3d8bff', textColor)

const navLinks = [
    { name: "Home", href: "#home" },
    { name: "Services", href: "#services" },
    { name: "Contact", href: "#contact" },
    { name: "About Us", href: "#about" },
    { name: "Testimonials", href: "#testimonials" },
]

const gooeyLinks: GooeyNavItem[] = navLinks.map(({ name, href }) => ({
    label: name,
    href,
}))

const gooeyListClassName = 'hidden items-center gap-1 lg:flex xl:gap-2'

const gooeyLinkClassName =
    'inline-flex items-center rounded-lg px-3 py-2 text-sm font-poppins uppercase tracking-[0.2em] text-gray-600 transition-colors hover:text-black focus-visible:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006dfc]/60 focus-visible:ring-offset-2'

const notchBackground: CSSProperties = {
    backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='M 0 0 L 20 0 C 8.954 0 0 8.954 0 20 Z' fill='%23ffffff'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
}

const Navbar = () => {
    const navigate = useNavigate()
    const { user, loading, logout } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const toggleRef = useRef<HTMLButtonElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const [showLogoutModal, setShowLogoutModal] = useState(false)

    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 1024px)')
        const handleChange = (event: MediaQueryListEvent) => {
            if (event.matches) setIsOpen(false)
        }

        desktop.addEventListener('change', handleChange)
        return () => desktop.removeEventListener('change', handleChange)
    }, [])

    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false)
                toggleRef.current?.focus()
            }
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node
            if (panelRef.current?.contains(target)) return
            if (toggleRef.current?.contains(target)) return
            setIsOpen(false)
        }

        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('pointerdown', handlePointerDown)
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('pointerdown', handlePointerDown)
            document.body.style.overflow = previousOverflow
        }
    }, [isOpen])

    const handleLogout = async () => {
    try {
        await logout()
        setIsOpen(false)
        navigate('/')
    } catch {
        alert('Unable to log out. Please try again.')
    }
}

    return (
        <nav aria-label="Primary" className="fixed inset-x-0 top-0 z-50 w-full px-6">
            <div
                aria-hidden="true"
                onClick={() => setIsOpen(false)}
                className={`fixed inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none lg:hidden ${
                    isOpen
                        ? 'pointer-events-auto opacity-100'
                        : 'pointer-events-none opacity-0'
                }`}
            />

            <div className="relative">
                <div
                    className={`relative mx-auto flex w-[70vw] max-lg:w-[calc(100vw-3rem)] items-center justify-between gap-4 bg-white px-4 py-2.5 transition-[border-radius,box-shadow] duration-200 sm:px-6 lg:max-w-[calc(100vw-12rem)] lg:shadow-none ${
                        isOpen
                            ? 'rounded-b-none shadow-none'
                            : 'rounded-b-[18px] shadow-[0_10px_30px_-14px_rgba(0,0,0,0.4)]'
                    }`}
                >
                    <a
                        href="#home"
                        className="flex h-10 w-auto shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8bff]/60 focus-visible:ring-offset-2 [&>svg]:h-full [&>svg]:w-auto"
                        aria-label="VillaCorz Beach House"
                        dangerouslySetInnerHTML={{ __html: logoMarkup }}
                    />

                    <div className="flex items-center gap-6">
                        <GooeyNav
                            items={gooeyLinks}
                            activeIndex={activeIndex}
                            onChange={(index) => setActiveIndex(index)}
                            color="#006dfc"
                            hoverColor="rgba(0, 109, 252, 0.14)"
                            className="hidden lg:block"
                            listClassName={gooeyListClassName}
                            linkClassName={gooeyLinkClassName}
                        />

                        <button
                            ref={toggleRef}
                            type="button"
                            aria-label={isOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={isOpen}
                            aria-controls="primary-navigation"
                            onClick={() => setIsOpen((open) => !open)}
                            className="inline-flex h-11 w-11 -mr-1.5 items-center justify-center rounded-xl border border-black/10 bg-black/[0.02] text-black transition hover:bg-black/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8bff]/60 focus-visible:ring-offset-2 lg:hidden"
                        >
                            {isOpen ? (
                                <X className="h-6 w-6" aria-hidden="true" />
                            ) : (
                                <Menu className="h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>

                    <span
                        aria-hidden="true"
                        style={notchBackground}
                        className="pointer-events-none absolute -right-5 top-0 h-5 w-5"
                    />
                    <span
                        aria-hidden="true"
                        style={notchBackground}
                        className="pointer-events-none absolute -left-5 top-0 h-5 w-5 rotate-90"
                    />
                </div>

                {!loading && (
                    user ? (
                        <DirectionalButton
                            fillColor="#ffffff"
                            textColor="#006dfc"
                            //onClick={handleLogout}
                            onClick={() => setShowLogoutModal(true)}
                            className="absolute right-0 top-1/2 hidden -translate-y-1/2 bg-[#006dfc] px-5 py-2.5 font-poppins text-xs font-semibold tracking-wide text-white lg:inline-flex"
                        >
                            LOGOUT
                        </DirectionalButton>
                    ) : (
                        <DirectionalButton
                            fillColor="#ffffff"
                            textColor="#006dfc"
                            onClick={() => navigate('/auth?mode=login')}
                            className="absolute right-0 top-1/2 hidden -translate-y-1/2 bg-[#006dfc] px-5 py-2.5 font-poppins text-xs font-semibold tracking-wide text-white lg:inline-flex"
                        >
                            LOGIN
                        </DirectionalButton>
                    )
                )}

                <div
                    ref={panelRef}
                    id="primary-navigation"
                    inert={!isOpen}
                    aria-hidden={!isOpen}
                    className={`absolute inset-x-0 top-full origin-top overflow-hidden rounded-b-[18px] bg-white shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)] transition duration-200 ease-out motion-reduce:transition-none lg:hidden ${
                        isOpen
                            ? 'pointer-events-auto translate-y-0 opacity-100'
                            : 'pointer-events-none -translate-y-2 opacity-0'
                    }`}
                >
                    <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain p-2">
                        <ul className="flex flex-col gap-1">
                            {navLinks.map((link) => (
                                <li key={link.name}>
                                    <a
                                        href={link.href}
                                        onClick={() => setIsOpen(false)}
                                        className="block rounded-xl px-4 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-gray-600 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8bff]/60 focus-visible:ring-inset"
                                    >
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>

                        <div className="px-1 pb-1 pt-2">
                            {!loading && (
                                user ? (
                                    <DirectionalButton
                                        type="button"
                                        fillColor={buttonColor}
                                        style={{ backgroundColor: buttonColor }}
                                        onClick={handleLogout}
                                        className="w-full px-5 py-3.5 text-sm font-semibold tracking-wide text-white transition hover:brightness-110"
                                    >
                                        LOGOUT
                                    </DirectionalButton>
                                ) : (
                                    <DirectionalButton
                                        type="button"
                                        fillColor={buttonColor}
                                        style={{ backgroundColor: buttonColor }}
                                        onClick={() => {
                                            setIsOpen(false)
                                            navigate('/auth?mode=login')
                                        }}
                                        className="w-full px-5 py-3.5 text-sm font-semibold tracking-wide text-white transition hover:brightness-110"
                                    >
                                        LOGIN
                                    </DirectionalButton>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {showLogoutModal && user && (
                <LogoutModal
                    onCancel={() => setShowLogoutModal(false)}
                    onConfirm={handleLogout}
                />
            )}
        </nav>
    )
}

export default Navbar
