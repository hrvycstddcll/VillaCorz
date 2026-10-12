import logoSvg from '../../VillaCorz-SVGLogo.svg?raw'

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

const Navbar = () => {
    return (
        <nav className="fixed inset-x-0 top-0 z-50 w-full bg-transparent px-6">
            <div className="mx-auto flex w-[70vw] max-w-[calc(100vw_-_12rem)] items-center justify-center gap-8 rounded-b-xl bg-white px-8 py-4">
                <a
                    href="#home"
                    className="flex h-10 w-auto shrink-0 items-center [&>svg]:h-full [&>svg]:w-auto"
                    aria-label="VillaCorz Beach House"
                    dangerouslySetInnerHTML={{ __html: logoMarkup }}
                />

                <div className="flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            className="whitespace-nowrap text-xs font-medium uppercase tracking-[0.2em] text-gray-600 transition-colors hover:text-black"
                        >
                            {link.name}
                        </a>
                    ))}
                </div>
            </div>

            <button
                type="button"
                style={{ backgroundColor: buttonColor }}
                className="absolute right-6 top-1/2 -translate-y-1/2 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
                LOGIN
            </button>
        </nav>
    )
}

export default Navbar