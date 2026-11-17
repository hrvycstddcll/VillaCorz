import { useMemo, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logoSvg from '../../VillaCorz-SVGLogo.svg?raw'
import {
    BarChart3,
    BedDouble,
    CalendarCheck,
    Images,
    Info,
    LayoutDashboard,
    Quote,
    Tags,
} from 'lucide-react'
import CardNav, { type CardNavItem } from './CardNav'
import { useAuth } from '../../../services/useAuth'
import { scrollToHash, scrollToTop } from '../../../lib/smoothScroll'

type NavChild = {
    label: string
    href: string
    description: string
    icon: ReactNode
}

const servicesLinks: NavChild[] = [
    {
        label: 'Browse services',
        href: '/services',
        description: 'Rooms, exclusive stays, and rates',
        icon: <BedDouble className="size-4" aria-hidden="true" />,
    },
]

const myBookingsLink: NavChild = {
    label: 'My bookings',
    href: '/bookings',
    description: 'Review or cancel a reservation',
    icon: <CalendarCheck className="size-4" aria-hidden="true" />,
}

const exploreLinks: NavChild[] = [
    {
        label: 'About us',
        href: '/#about',
        description: 'The story behind the beach house',
        icon: <Info className="size-4" aria-hidden="true" />,
    },
    {
        label: 'Gallery',
        href: '/#gallery',
        description: 'A look around the property',
        icon: <Images className="size-4" aria-hidden="true" />,
    },
    {
        label: 'Testimonials',
        href: '/#testimonials',
        description: 'What past guests remember',
        icon: <Quote className="size-4" aria-hidden="true" />,
    },
]

const adminLinks: NavChild[] = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        description: 'Bookings and revenue at a glance',
        icon: <LayoutDashboard className="size-4" aria-hidden="true" />,
    },
    {
        label: 'Manage offers',
        href: '/manageOffers',
        description: 'Rooms, rates, and availability',
        icon: <Tags className="size-4" aria-hidden="true" />,
    },
    {
        label: 'Reports',
        href: '/reports',
        description: 'Payment and booking history',
        icon: <BarChart3 className="size-4" aria-hidden="true" />,
    },
]

const Navbar = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, loading } = useAuth()
    const isAdmin = user?.role === 'admin'
    const logoDataUrl = useMemo(
        () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg)}`,
        [],
    )

    const serviceChildren = useMemo(
        () => (user ? [...servicesLinks, myBookingsLink] : servicesLinks),
        [user],
    )

    const cardNavItems = useMemo<CardNavItem[]>(() => {
        const items: CardNavItem[] = [
            {
                label: 'Home',
                description: 'Welcome to VillaCorz Beach House',
                links: [{ label: 'Home', href: '/#home' }],
            },
            {
                label: 'Services',
                description: 'Rooms, exclusive stays, and rates',
                links: serviceChildren.map((child) => ({
                    label: child.label,
                    href: child.href,
                    ariaLabel: child.label,
                })),
            },
            {
                label: 'Explore',
                description: 'Discover the property',
                links: exploreLinks.map((child) => ({
                    label: child.label,
                    href: child.href,
                    ariaLabel: child.label,
                })),
            },
            {
                label: 'Contact',
                description: 'Send us a message',
                links: [{ label: 'Contact', href: '/#contact' }],
            },
        ]

        if (isAdmin) {
            items.push({
                label: 'Admin',
                description: 'Manage bookings, offers, and reports',
                links: adminLinks.map((child) => ({
                    label: child.label,
                    href: child.href,
                    ariaLabel: child.label,
                })),
            })
        }

        return items
    }, [isAdmin, serviceChildren])

    const cta = loading
        ? undefined
        : user
          ? { label: 'Settings', onClick: () => navigate('/settings') }
          : { label: 'Login', onClick: () => navigate('/auth?mode=login') }

    const goTo = (href: string) => {
        const hashIndex = href.indexOf('#')
        const path = hashIndex === -1 ? href : href.slice(0, hashIndex) || '/'
        const hash = hashIndex === -1 ? '' : href.slice(hashIndex)

        if (location.pathname === path && location.hash === hash) {
            if (hash) scrollToHash(hash)
            else scrollToTop()
            return
        }

        navigate(href)
    }

    return (
        <div className="fixed inset-x-0 top-0 z-50 w-full px-0 pt-0 sm:px-6">
            <CardNav
                className="card-nav--notch"
                notch
                logo={logoDataUrl}
                logoAlt="VillaCorz Beach House"
                logoHref="/#home"
                items={cardNavItems}
                cta={cta}
                linkComponent={Link}
                onLinkClick={(link) => {
                    if (link.href) goTo(link.href)
                }}
                theme="villacorz"
                surface="solid"
                openOn="click"
                cardEffect="rise"
                maxWidth={960}
            />
        </div>
    )
}

export default Navbar
