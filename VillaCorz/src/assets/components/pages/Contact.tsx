
import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type FormEvent,
    type ReactNode,
} from 'react'
import axios from 'axios'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import api from '../../../services/api'
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    Popup,
    Polyline,
    useMap,
} from 'react-leaflet'
import {
    Mail,
    MapPin,
    Navigation,
    Clock,
    Route,
    LoaderCircle,
    ArrowUpRight,
    Send,
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import './Contact.css'
import contactReef from '../../images/contact-reef.png'

gsap.registerPlugin(ScrollTrigger, SplitText)

type Coordinates = {
    lat: number
    lng: number
}

type RouteInfo = {
    distance: number
    duration: number
}

const REVEAL_GROUPS: {
    selector: string
    animation: gsap.TweenVars
}[] = [
    {
        selector: '[data-animate="heading-aside"]',
        animation: { y: 26, duration: 0.9 },
    },
    {
        selector: '[data-animate="map-copy"]',
        animation: { y: 24, duration: 0.85 },
    },
    {
        selector: '[data-animate="map-actions"]',
        animation: { y: 18, duration: 0.8 },
    },
    {
        selector: '[data-animate="block-title"]',
        animation: { y: 22, duration: 0.85 },
    },
    {
        selector: '[data-animate="contact"]',
        animation: { y: 24, duration: 0.8, stagger: 0.12 },
    },
    { selector: '[data-animate="form"]', animation: { x: 42, duration: 1 } },
    { selector: '[data-animate="map"]', animation: { y: 34, duration: 1 } },
    { selector: '[data-animate="directions"]', animation: { y: 16 } },
]

const VILLA_LOCATION: Coordinates = {
    lat: 13.95007,
    lng: 120.618683,
}

const VILLA_NAME = 'VillaCorz'

type BubbleSpec = {
    id: string
    top: number
    left: number
    size: number
    travel: number
    drift: number
    opacity: number
    tone?: 'azure' | 'bright'
}

/**
 * Decorative bubbles are laid out as percentages so they spread evenly
 * across the section regardless of its rendered height.
 */
const BUBBLES: BubbleSpec[] = [
    { id: 'b01', top: 3, left: 4, size: 42, travel: 90, drift: 26, opacity: 0.55 },
    { id: 'b02', top: 6, left: 82, size: 22, travel: 150, drift: 18, opacity: 0.5 },
    { id: 'b03', top: 9, left: 34, size: 10, travel: 70, drift: 14, opacity: 0.6, tone: 'bright' },
    { id: 'b04', top: 13, left: 60, size: 64, travel: 200, drift: 34, opacity: 0.45, tone: 'azure' },
    { id: 'b05', top: 17, left: 12, size: 16, travel: 110, drift: 20, opacity: 0.55 },
    { id: 'b06', top: 22, left: 90, size: 34, travel: 170, drift: 28, opacity: 0.5 },
    { id: 'b07', top: 27, left: 46, size: 8, travel: 80, drift: 12, opacity: 0.65, tone: 'bright' },
    { id: 'b08', top: 32, left: 22, size: 56, travel: 190, drift: 36, opacity: 0.4 },
    { id: 'b09', top: 38, left: 74, size: 20, travel: 120, drift: 22, opacity: 0.55, tone: 'azure' },
    { id: 'b10', top: 44, left: 8, size: 26, travel: 140, drift: 24, opacity: 0.5 },
    { id: 'b11', top: 49, left: 56, size: 12, travel: 90, drift: 14, opacity: 0.6, tone: 'bright' },
    { id: 'b12', top: 55, left: 88, size: 72, travel: 220, drift: 42, opacity: 0.35, tone: 'azure' },
    { id: 'b13', top: 61, left: 30, size: 18, travel: 110, drift: 18, opacity: 0.5 },
    { id: 'b14', top: 67, left: 68, size: 38, travel: 160, drift: 30, opacity: 0.45 },
    { id: 'b15', top: 73, left: 4, size: 14, travel: 90, drift: 16, opacity: 0.55 },
    { id: 'b16', top: 79, left: 48, size: 10, travel: 70, drift: 12, opacity: 0.6, tone: 'bright' },
    { id: 'b17', top: 85, left: 84, size: 48, travel: 180, drift: 34, opacity: 0.4, tone: 'azure' },
    { id: 'b18', top: 91, left: 18, size: 28, travel: 130, drift: 24, opacity: 0.45 },
    { id: 'b19', top: 95, left: 62, size: 16, travel: 100, drift: 18, opacity: 0.5 },
]

function MapViewport({
    userLocation,
}: {
    userLocation: Coordinates | null
}) {
    const map = useMap()

    useEffect(() => {
        if (userLocation) {
            map.fitBounds(
                [
                    [userLocation.lat, userLocation.lng],
                    [VILLA_LOCATION.lat, VILLA_LOCATION.lng],
                ],
                { padding: [50, 50], maxZoom: 15 },
            )
        } else {
            map.setView(
                [VILLA_LOCATION.lat, VILLA_LOCATION.lng],
                15,
            )
        }
    }, [map, userLocation])

    return null
}

function LocationSection({
    userLocation,
    routeCoordinates,
    routeInfo,
    isLocating,
    isRouting,
    locationError,
    routeError,
    directionsUrl,
    onLocate,
    formatDistance,
    formatDuration,
}: {
    userLocation: Coordinates | null
    routeCoordinates: [number, number][]
    routeInfo: RouteInfo | null
    isLocating: boolean
    isRouting: boolean
    locationError: string
    routeError: string
    directionsUrl: string
    onLocate: () => void
    formatDistance: (meters: number) => string
    formatDuration: (seconds: number) => string
}) {
    return (
        <div className="contact-location">
            <div className="contact-location__intro">
                <div
                    data-animate="map-copy"
                    className="contact-location__lead"
                >
                    <span className="contact-eyebrow">
                        <span className="contact-eyebrow__line" />
                        Find Us
                    </span>

                    <h3
                        data-split
                        className="contact-location__title"
                    >
                        Your journey to VillaCorz.
                    </h3>

                    <p className="contact-location__description">
                        Find our location and discover how far you are from your
                        next getaway.
                    </p>
                </div>

                <div
                    data-animate="map-actions"
                    className="contact-location__actions"
                >
                    <button
                        type="button"
                        onClick={onLocate}
                        disabled={isLocating}
                        className="contact-location__button"
                    >
                        {isLocating ? (
                            <LoaderCircle className="contact-icon-spin" />
                        ) : (
                            <Navigation size={17} />
                        )}
                        {isLocating ? 'Finding Location...' : 'Get My Location'}
                    </button>

                    {locationError && (
                        <p
                            role="alert"
                            className="contact-error"
                        >
                            {locationError}
                        </p>
                    )}
                </div>
            </div>

            <div
                data-animate="map"
                className="contact-location__map"
            >
                <div className="contact-map-frame">
                    <div className="contact-map-canvas">
                    <MapContainer
                        center={[VILLA_LOCATION.lat, VILLA_LOCATION.lng]}
                        zoom={15}
                        scrollWheelZoom={false}
                        className="contact-map"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            maxZoom={19}
                        />
                        <MapViewport userLocation={userLocation} />
                        <CircleMarker
                            center={[VILLA_LOCATION.lat, VILLA_LOCATION.lng]}
                            radius={11}
                            pathOptions={{
                                color: '#ffffff',
                                weight: 3,
                                fillColor: '#006dfc',
                                fillOpacity: 1,
                            }}
                        >
                            <Popup>
                                <strong>{VILLA_NAME}</strong>
                                <br />
                                Your destination
                            </Popup>
                        </CircleMarker>
                        {userLocation && (
                            <CircleMarker
                                center={[userLocation.lat, userLocation.lng]}
                                radius={8}
                                pathOptions={{
                                    color: '#ffffff',
                                    weight: 3,
                                    fillColor: '#16a34a',
                                    fillOpacity: 1,
                                }}
                            >
                                <Popup>Your current location</Popup>
                            </CircleMarker>
                        )}
                        {routeCoordinates.length > 0 && (
                            <Polyline
                                positions={routeCoordinates}
                                pathOptions={{
                                    color: '#006dfc',
                                    weight: 5,
                                    opacity: 0.85,
                                }}
                            />
                        )}
                    </MapContainer>
                    </div>

                    <span
                        aria-hidden="true"
                        className="contact-map-stamp"
                    >
                        <MapPin size={13} />
                        Matabungkay · Batangas
                    </span>
                </div>
            </div>

            <div className="contact-route">
                {!userLocation ? (
                    <div className="contact-route__prompt">
                        <div className="contact-icon-box">
                            <Navigation size={22} />
                        </div>
                        <div>
                            <p className="contact-detail__title">
                                How far are you from VillaCorz?
                            </p>
                            <p className="contact-detail__description">
                                Allow location access to calculate your driving
                                distance and estimated travel time.
                            </p>
                        </div>
                    </div>
                ) : isRouting ? (
                    <div className="contact-route__loading">
                        <LoaderCircle className="contact-icon-spin contact-icon-spin--large" />
                        Calculating your driving route...
                    </div>
                ) : routeInfo ? (
                    <div
                        data-animate="route-info"
                        className="contact-route__metrics"
                    >
                        <RouteMetric
                            icon={<Route size={22} />}
                            label="Driving Distance"
                            value={formatDistance(routeInfo.distance)}
                        />
                        <RouteMetric
                            icon={<Clock size={22} />}
                            label="Estimated Travel Time"
                            value={formatDuration(routeInfo.duration)}
                        />
                    </div>
                ) : routeError ? (
                    <p
                        role="alert"
                        className="contact-error"
                    >
                        {routeError}
                    </p>
                ) : null}

                <div
                    data-animate="directions"
                    className="contact-directions"
                >
                    <p className="contact-directions__note">
                        Map data © OpenStreetMap contributors. Routes provided by
                        OSRM. Travel times are estimates and don't account for
                        live traffic.
                    </p>
                    <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contact-directions__link"
                    >
                        Get Directions
                        <ArrowUpRight className="contact-arrow" />
                    </a>
                </div>
            </div>
        </div>
    )
}

function RouteMetric({
    icon,
    label,
    value,
}: {
    icon: ReactNode
    label: string
    value: string
}) {
    return (
        <div className="contact-metric">
            <div className="contact-icon-box">
                {icon}
            </div>
            <div>
                <p className="contact-metric__label">
                    {label}
                </p>
                <p className="contact-metric__value">{value}</p>
            </div>
        </div>
    )
}

const Contact = () => {
    const sectionRef = useRef<HTMLElement>(null)
    const feedbackRef = useRef<HTMLParagraphElement>(null)

    const [userLocation, setUserLocation] =
        useState<Coordinates | null>(null)

    const [routeCoordinates, setRouteCoordinates] =
        useState<[number, number][]>([])

    const [routeInfo, setRouteInfo] =
        useState<RouteInfo | null>(null)

    const [isLocating, setIsLocating] = useState(false)
    const [isRouting, setIsRouting] = useState(false)
    const [locationError, setLocationError] = useState('')
    const [routeError, setRouteError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [formFeedback, setFormFeedback] = useState<{
        type: 'success' | 'error'
        message: string
    } | null>(null)

    useEffect(() => {
        const section = sectionRef.current
        if (!section) return

        const media = gsap.matchMedia()
        const splits: SplitText[] = []
        let removePointerListener: (() => void) | undefined

        media.add('(prefers-reduced-motion: no-preference)', () => {
            // Editorial line-by-line reveals for the display text.
            section
                .querySelectorAll<HTMLElement>('[data-split]')
                .forEach((target) => {
                    const split = SplitText.create(target, {
                        type: 'lines,words',
                        mask: 'lines',
                        linesClass: 'contact-split-line',
                        wordsClass: 'contact-split-word',
                    })

                    splits.push(split)

                    gsap.from(split.lines, {
                        yPercent: 118,
                        duration: 1.05,
                        ease: 'power4.out',
                        stagger: 0.09,
                        scrollTrigger: {
                            trigger: target,
                            start: 'top 88%',
                            once: true,
                        },
                    })
                })

            // Scroll reveals for the main content groups.
            REVEAL_GROUPS.forEach(({ selector, animation }) => {
                const elements = section.querySelectorAll<HTMLElement>(selector)
                if (!elements.length) return

                gsap.from(elements, {
                    y: 34,
                    autoAlpha: 0,
                    duration: 0.9,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: elements[0],
                        start: 'top 85%',
                        once: true,
                    },
                    ...animation,
                })
            })

            const eyebrowLines = section.querySelectorAll<HTMLElement>(
                '.contact-eyebrow__line',
            )

            if (eyebrowLines.length) {
                gsap.from(eyebrowLines, {
                    scaleX: 0,
                    transformOrigin: 'left center',
                    duration: 0.9,
                    ease: 'power3.out',
                    stagger: 0.15,
                    scrollTrigger: {
                        trigger: section,
                        start: 'top 80%',
                        once: true,
                    },
                })
            }

            // Ambient light shafts drifting from the top of the section.
            section
                .querySelectorAll<HTMLElement>('[data-beam]')
                .forEach((beam, index) => {
                    gsap.to(beam, {
                        xPercent: index % 2 === 0 ? 9 : -9,
                        opacity: index % 2 === 0 ? 0.55 : 0.32,
                        duration: 10 + index * 2.6,
                        delay: index * 0.9,
                        repeat: -1,
                        yoyo: true,
                        ease: 'sine.inOut',
                    })

                    gsap.to(beam, {
                        yPercent: 10 + index * 3,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: section,
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: 1.6,
                        },
                    })
                })

            // Scroll parallax + gentle drift for each bubble.
            const bubbles = section.querySelectorAll<HTMLElement>('[data-bubble]')

            bubbles.forEach((bubble, index) => {
                const travel = Number(bubble.dataset.bubbleTravel) || 120
                const drift = Number(bubble.dataset.bubbleDrift) || 24

                gsap.fromTo(
                    bubble,
                    { y: travel * 0.45 },
                    {
                        y: travel * -0.55,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: section,
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: 1.1,
                            invalidateOnRefresh: true,
                        },
                    },
                )

                gsap.to(bubble, {
                    x: drift,
                    duration: 6 + (index % 5) * 1.4,
                    delay: index * 0.22,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                })
            })

            // Reef and glows move at a slower rate to add depth.
            const reef = section.querySelector<HTMLElement>('.contact-reef')

            if (reef) {
                gsap.fromTo(
                    reef,
                    { yPercent: -5 },
                    {
                        yPercent: 5,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: section,
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: 1.2,
                        },
                    },
                )
            }

            section
                .querySelectorAll<HTMLElement>('.contact-glow')
                .forEach((glow, index) => {
                    gsap.to(glow, {
                        yPercent: index === 0 ? -16 : 16,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: section,
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: 1.4,
                        },
                    })
                })

            // Pointer parallax for the whole bubble field (desktop only).
            const bubbleField = section.querySelector<HTMLElement>(
                '[data-bubble-field]',
            )
            const hasFinePointer = window.matchMedia('(pointer: fine)').matches

            if (bubbleField && hasFinePointer) {
                const xTo = gsap.quickTo(bubbleField, 'x', {
                    duration: 0.9,
                    ease: 'power3',
                })
                const yTo = gsap.quickTo(bubbleField, 'y', {
                    duration: 0.9,
                    ease: 'power3',
                })

                const handlePointerMove = (event: PointerEvent) => {
                    xTo((event.clientX / window.innerWidth - 0.5) * -34)
                    yTo((event.clientY / window.innerHeight - 0.5) * -24)
                }

                section.addEventListener('pointermove', handlePointerMove)
                removePointerListener = () =>
                    section.removeEventListener('pointermove', handlePointerMove)
            }

            return () => {
                removePointerListener?.()
                removePointerListener = undefined
                splits.forEach((split) => split.revert())
                splits.length = 0
            }
        })

        return () => media.revert()
    }, [])

    // Animate route information when it becomes available.
    useEffect(() => {
        if (!routeInfo || !sectionRef.current) return

        const metrics = sectionRef.current.querySelector(
            '[data-animate="route-info"]',
        )

        if (!metrics) return

        const animation = gsap.fromTo(
            metrics,
            { y: 20, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.7,
                ease: 'power3.out',
            },
        )

        return () => {
            animation.kill()
        }
    }, [routeInfo])

    // Animate the form feedback in when the submission result changes.
    useEffect(() => {
        if (!formFeedback || !feedbackRef.current) return

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return
        }

        const animation = gsap.fromTo(
            feedbackRef.current,
            { y: 10, autoAlpha: 0 },
            {
                y: 0,
                autoAlpha: 1,
                duration: 0.45,
                ease: 'power2.out',
            },
        )

        return () => {
            animation.kill()
        }
    }, [formFeedback])

    // Contact form submission
    const handleContactSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault()
        setFormFeedback(null)
        setIsSubmitting(true)

        const form = event.currentTarget
        const formData = new FormData(form)

        try {
            const response = await api.post('/contact', {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message'),
            })

            form.reset()

            setFormFeedback({
                type: 'success',
                message: response.data.message,
            })
        } catch (error) {
            const data = axios.isAxiosError(error)
                ? error.response?.data as {
                    message?: string
                    errors?: Record<string, string[]>
                } | undefined
                : undefined

            const validationError =
                Object.values(data?.errors ?? {}).flat()[0]

            setFormFeedback({
                type: 'error',
                message:
                    validationError ||
                    data?.message ||
                    'Unable to send your message. Please try again.',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Get visitor location
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocationError(
                'Geolocation is not supported by your browser.',
            )
            return
        }

        setIsLocating(true)
        setLocationError('')

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                })

                setIsLocating(false)
            },
            (error) => {
                const messages: Record<number, string> = {
                    1: 'Location permission was denied. Please allow location access.',
                    2: 'Your current location is unavailable.',
                    3: 'Location request timed out. Please try again.',
                }

                setLocationError(
                    messages[error.code] ||
                    'Unable to get your location.',
                )

                setIsLocating(false)
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000,
            },
        )
    }

    // Calculate driving route
    useEffect(() => {
        if (!userLocation) return

        const controller = new AbortController()

        const getRoute = async () => {
            setIsRouting(true)
            setRouteError('')
            setRouteInfo(null)
            setRouteCoordinates([])

            try {
                const url =
                    `https://router.project-osrm.org/route/v1/driving/` +
                    `${userLocation.lng},${userLocation.lat};` +
                    `${VILLA_LOCATION.lng},${VILLA_LOCATION.lat}` +
                    `?overview=full&geometries=geojson`

                const response = await fetch(url, {
                    signal: controller.signal,
                })

                if (!response.ok) {
                    throw new Error('Unable to calculate the route.')
                }

                const data = await response.json()

                if (data.code !== 'Ok' || !data.routes?.length) {
                    throw new Error('No driving route was found.')
                }

                const route = data.routes[0]

                setRouteInfo({
                    distance: route.distance,
                    duration: route.duration,
                })

                setRouteCoordinates(
                    route.geometry.coordinates.map(
                        ([lng, lat]: [number, number]) =>
                            [lat, lng] as [number, number],
                    ),
                )
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name === 'AbortError'
                ) {
                    return
                }

                setRouteError(
                    error instanceof Error
                        ? error.message
                        : 'Unable to calculate the route.',
                )
            } finally {
                if (!controller.signal.aborted) {
                    setIsRouting(false)
                }
            }
        }

        getRoute()

        return () => controller.abort()
    }, [userLocation])

    const formatDistance = (meters: number) => {
        return meters >= 1000
            ? `${(meters / 1000).toFixed(1)} km`
            : `${Math.round(meters)} m`
    }

    const formatDuration = (seconds: number) => {
        const minutes = Math.round(seconds / 60)
        const hours = Math.floor(minutes / 60)
        const remainingMinutes = minutes % 60

        if (hours === 0) return `${minutes} min`

        return remainingMinutes
            ? `${hours} hr ${remainingMinutes} min`
            : `${hours} hr`
    }

    const directionsUrl = userLocation
        ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${VILLA_LOCATION.lat},${VILLA_LOCATION.lng}&travelmode=driving`
        : `https://www.google.com/maps/dir/?api=1&destination=${VILLA_LOCATION.lat},${VILLA_LOCATION.lng}`

    return (
        <section
            ref={sectionRef}
            id="contact"
            className="contact-section"
        >
            <div
                aria-hidden="true"
                className="contact-beams"
            >
                <span
                    data-beam
                    className="contact-beam contact-beam--one"
                />
                <span
                    data-beam
                    className="contact-beam contact-beam--two"
                />
                <span
                    data-beam
                    className="contact-beam contact-beam--three"
                />
                <span
                    data-beam
                    className="contact-beam contact-beam--four"
                />
            </div>

            <div
                aria-hidden="true"
                className="contact-glow contact-glow--top"
            />

            <div
                aria-hidden="true"
                className="contact-glow contact-glow--bottom"
            />

            <img
                src={contactReef}
                alt=""
                aria-hidden="true"
                className="contact-reef"
            />

            <div
                aria-hidden="true"
                className="contact-bubbles"
            >
                <div
                    className="contact-bubbles__field"
                    data-bubble-field
                >
                    {BUBBLES.map((bubble) => (
                        <span
                            key={bubble.id}
                            data-bubble
                            data-bubble-travel={bubble.travel}
                            data-bubble-drift={bubble.drift}
                            style={
                                {
                                    '--bubble-top': `${bubble.top}%`,
                                    '--bubble-left': `${bubble.left}%`,
                                    '--bubble-size': `${bubble.size}px`,
                                    '--bubble-opacity': bubble.opacity,
                                } as CSSProperties
                            }
                            className={`contact-bubble${
                                bubble.tone
                                    ? ` contact-bubble--${bubble.tone}`
                                    : ''
                            }`}
                        />
                    ))}
                </div>
            </div>

            <div
                aria-hidden="true"
                className="contact-grain"
            />

            <div className="contact-container">

                <header className="contact-heading">
                    <div className="contact-heading__lead">
                        <div className="contact-heading__meta">
                            <span className="contact-index">
                                Contact
                            </span>

                            <span className="contact-eyebrow">
                                <span className="contact-eyebrow__line" />
                                Get in touch
                            </span>
                        </div>

                        <h2
                            data-split
                            className="contact-heading__title"
                        >
                            We'd love to <em>hear from you.</em>
                        </h2>
                    </div>

                    <div
                        data-animate="heading-aside"
                        className="contact-heading__aside"
                    >
                        <p className="contact-heading__description">
                            Have questions about your stay or planning your
                            next getaway? Send us a message. We'd be happy
                            to help make your VillaCorz experience special.
                        </p>

                        <div className="contact-heading__meta-list">
                            <span>Matabungkay</span>
                            <span>Lian, Batangas</span>
                            <span>13.9501° N · 120.6187° E</span>
                        </div>
                    </div>
                </header>

                <LocationSection
                    userLocation={userLocation}
                    routeCoordinates={routeCoordinates}
                    routeInfo={routeInfo}
                    isLocating={isLocating}
                    isRouting={isRouting}
                    locationError={locationError}
                    routeError={routeError}
                    directionsUrl={directionsUrl}
                    onLocate={getCurrentLocation}
                    formatDistance={formatDistance}
                    formatDuration={formatDuration}
                />

                {/* Contact information and form */}
                <div className="contact-block">
                    <div
                        data-animate="block-title"
                        className="contact-block__header"
                    >
                        <span className="contact-eyebrow">
                            <span className="contact-eyebrow__line" />
                            Say hello
                        </span>

                        <h3
                            data-split
                            className="contact-block__title"
                        >
                            Send us a note.
                        </h3>
                    </div>

                    <div className="contact-grid">

                        <div className="contact-details">

                            <div
                                data-animate="contact"
                                className="contact-row"
                            >
                                <span className="contact-row__index">
                                    01
                                </span>

                                <div className="contact-row__body">
                                    <p className="contact-row__label">
                                        Visit
                                    </p>

                                    <p className="contact-row__value">
                                        Matabungkay, Lian, Batangas
                                    </p>
                                </div>

                                <MapPin className="contact-row__icon" />
                            </div>

                            <div
                                data-animate="contact"
                                className="contact-row"
                            >
                                <span className="contact-row__index">
                                    02
                                </span>

                                <div className="contact-row__body">
                                    <p className="contact-row__label">
                                        Write
                                    </p>

                                    <p className="contact-row__value">
                                        Send us a message
                                    </p>

                                    <p className="contact-row__description">
                                        We'll reply to the email address
                                        you provide.
                                    </p>
                                </div>

                                <Mail className="contact-row__icon" />
                            </div>

                            <blockquote
                                data-animate="contact"
                                className="contact-note"
                            >
                                <p className="contact-note__title">
                                    Your getaway is just a message away.
                                </p>

                                <p className="contact-note__description">
                                    We look forward to welcoming you to
                                    VillaCorz.
                                </p>
                            </blockquote>
                        </div>

                        {/* Contact form */}
                        <div
                            data-animate="form"
                            className="contact-form-card"
                        >
                            <div className="contact-form-card__header">
                                <span className="contact-form-card__eyebrow">
                                    Send an inquiry
                                </span>

                                <h3 className="contact-form-card__title">
                                    Let's talk.
                                </h3>

                                <p className="contact-form-card__description">
                                    Fill out the form below and we'll get
                                    back to you.
                                </p>
                            </div>

                            <form
                                onSubmit={handleContactSubmit}
                                className="contact-form"
                            >
                                <div className="contact-form__row">
                                    <div>
                                        <label
                                            htmlFor="contact-name"
                                            className="contact-form__label"
                                        >
                                            Full name
                                        </label>

                                        <input
                                            id="contact-name"
                                            name="name"
                                            type="text"
                                            required
                                            maxLength={120}
                                            autoComplete="name"
                                            placeholder="Enter your name"
                                            className="contact-form__input"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="contact-email"
                                            className="contact-form__label"
                                        >
                                            Email address
                                        </label>

                                        <input
                                            id="contact-email"
                                            name="email"
                                            type="email"
                                            required
                                            maxLength={254}
                                            autoComplete="email"
                                            placeholder="Enter your email"
                                            className="contact-form__input"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="contact-message"
                                        className="contact-form__label"
                                    >
                                        Message
                                    </label>

                                    <textarea
                                        id="contact-message"
                                        name="message"
                                        rows={5}
                                        required
                                        maxLength={5000}
                                        placeholder="How can we help you?"
                                        className="contact-form__textarea"
                                    />
                                </div>

                                {formFeedback && (
                                    <p
                                        role={
                                            formFeedback.type === 'error'
                                                ? 'alert'
                                                : 'status'
                                        }
                                        ref={feedbackRef}
                                        className={`contact-form__feedback ${
                                            formFeedback.type === 'error'
                                                ? 'contact-form__feedback--error'
                                                : 'contact-form__feedback--success'
                                        }`}
                                    >
                                        {formFeedback.message}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="contact-form__submit"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <LoaderCircle className="contact-icon-spin" />
                                            Sending message...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="contact-icon" />
                                            Send message
                                            <ArrowUpRight
                                                className="contact-arrow contact-form__arrow"
                                            />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <footer className="contact-footer">
                    <span>VillaCorz Beach House</span>
                    <span className="contact-footer__line" />
                    <span>Matabungkay · Lian · Batangas</span>
                </footer>
            </div>
        </section>
    )
}

export default Contact
