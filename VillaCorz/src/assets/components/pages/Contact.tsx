
import { useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
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
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'

type Coordinates = {
    lat: number
    lng: number
}

type RouteInfo = {
    distance: number
    duration: number
}

const VILLA_LOCATION: Coordinates = {
    lat: 13.95007,
    lng: 120.618683,
}

const VILLA_NAME = 'VillaCorz'

// Automatically adjusts the map when the visitor's location is detected.
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

const Contact = () => {
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

    const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
            const validationError = Object.values(data?.errors ?? {}).flat()[0]

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

    // Request the visitor's current location.
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
                    messages[error.code] || 'Unable to get your location.',
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

    // Request a driving route from the visitor to VillaCorz.
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
        <section id="contact" className="bg-white px-6 py-24">
            <div className="mx-auto max-w-7xl">

                {/* Section heading */}
                <div className="mb-14">
                    <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[#006dfc]">
                        Get in Touch
                    </span>

                    <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                        We'd Love to Hear From You.
                    </h2>

                    <p className="mt-4 max-w-xl text-slate-500">
                        Have questions about your stay? Feel free to reach
                        out. We're always happy to help.
                    </p>
                </div>

                <div className="grid gap-14 md:grid-cols-2">

                    <div className="space-y-8">
                        <div className="flex items-start gap-4">
                            <div className="rounded-lg bg-[#006dfc]/10 p-3 text-[#006dfc]">
                                <MapPin size={22} />
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    Our Location
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Mabuhangray, Lian, Batangas
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="rounded-lg bg-[#006dfc]/10 p-3 text-[#006dfc]">
                                <Mail size={22} />
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    Get in Touch
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Send us a message using the form. We will
                                    reply to the email address you provide.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form
                        onSubmit={handleContactSubmit}
                        className="space-y-5"
                    >
                        <div>
                            <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-slate-700">
                                Full Name
                            </label>
                            <input
                                id="contact-name"
                                name="name"
                                type="text"
                                required
                                maxLength={120}
                                autoComplete="name"
                                placeholder="Enter your name"
                                className="w-full border-b border-slate-300 bg-transparent px-1 py-3 text-sm outline-none transition focus:border-[#006dfc]"
                            />
                        </div>

                        <div>
                            <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-slate-700">
                                Email Address
                            </label>
                            <input
                                id="contact-email"
                                name="email"
                                type="email"
                                required
                                maxLength={254}
                                autoComplete="email"
                                placeholder="Enter your email"
                                className="w-full border-b border-slate-300 bg-transparent px-1 py-3 text-sm outline-none transition focus:border-[#006dfc]"
                            />
                        </div>

                        <div>
                            <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-slate-700">
                                Message
                            </label>
                            <textarea
                                id="contact-message"
                                name="message"
                                rows={4}
                                required
                                maxLength={5000}
                                placeholder="How can we help you?"
                                className="w-full resize-none border-b border-slate-300 bg-transparent px-1 py-3 text-sm outline-none transition focus:border-[#006dfc]"
                            />
                        </div>

                        {formFeedback && (
                            <p
                                role={formFeedback.type === 'error' ? 'alert' : 'status'}
                                className={`text-sm ${
                                    formFeedback.type === 'error'
                                        ? 'text-red-600'
                                        : 'text-green-700'
                                }`}
                            >
                                {formFeedback.message}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-[#006dfc] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#0056cc] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? 'Sending...' : 'Send Message'}
                        </button>
                    </form>
                </div>

                {/* Location map */}
                <div className="mt-20">
                    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[#006dfc]">
                                Find Us
                            </span>

                            <h3 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                                Visit VillaCorz
                            </h3>

                            <p className="mt-2 text-sm text-slate-500">
                                Discover our location and plan your journey.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={getCurrentLocation}
                            disabled={isLocating}
                            className="inline-flex items-center justify-center gap-2 bg-[#006dfc] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0056cc] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLocating ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <Navigation className="size-4" />
                            )}

                            {isLocating
                                ? 'Finding location...'
                                : 'Get My Location'}
                        </button>
                    </div>

                    {/* Location errors */}
                    {locationError && (
                        <p role="alert" className="mb-4 text-sm text-red-600">
                            {locationError}
                        </p>
                    )}

                    {/* Map */}
                    <div className="relative z-0 h-[350px] overflow-hidden border border-slate-200 shadow-sm md:h-[450px]">
                        <MapContainer
                            center={[
                                VILLA_LOCATION.lat,
                                VILLA_LOCATION.lng,
                            ]}
                            zoom={15}
                            scrollWheelZoom={false}
                            className="h-full w-full"
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                maxZoom={19}
                            />

                            <MapViewport userLocation={userLocation} />

                            {/* VillaCorz marker */}
                            <CircleMarker
                                center={[
                                    VILLA_LOCATION.lat,
                                    VILLA_LOCATION.lng,
                                ]}
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

                            {/* Visitor marker */}
                            {userLocation && (
                                <CircleMarker
                                    center={[
                                        userLocation.lat,
                                        userLocation.lng,
                                    ]}
                                    radius={8}
                                    pathOptions={{
                                        color: '#ffffff',
                                        weight: 3,
                                        fillColor: '#16a34a',
                                        fillOpacity: 1,
                                    }}
                                >
                                    <Popup>
                                        Your current location
                                    </Popup>
                                </CircleMarker>
                            )}

                            {/* Driving route */}
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

                    {/* Route information */}
                    <div className="mt-5">
                        {!userLocation ? (
                            <div className="flex items-start gap-3 bg-slate-50 p-5">
                                <Navigation className="mt-1 size-5 shrink-0 text-[#006dfc]" />
                                <div>
                                    <p className="font-semibold text-slate-900">
                                        Want to know how far we are?
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Allow location access to calculate
                                        your driving distance and estimated
                                        travel time to VillaCorz.
                                    </p>
                                </div>
                            </div>
                        ) : isRouting ? (
                            <div className="flex items-center gap-3 bg-slate-50 p-5 text-sm text-slate-600">
                                <LoaderCircle className="size-5 animate-spin text-[#006dfc]" />
                                Calculating your route...
                            </div>
                        ) : routeInfo ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex items-center gap-4 bg-slate-50 p-5">
                                    <div className="rounded-lg bg-[#006dfc]/10 p-3 text-[#006dfc]">
                                        <Route size={22} />
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                            Driving Distance
                                        </p>
                                        <p className="mt-1 text-xl font-bold text-slate-900">
                                            {formatDistance(routeInfo.distance)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 bg-slate-50 p-5">
                                    <div className="rounded-lg bg-[#006dfc]/10 p-3 text-[#006dfc]">
                                        <Clock size={22} />
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                            Estimated Travel Time
                                        </p>
                                        <p className="mt-1 text-xl font-bold text-slate-900">
                                            {formatDuration(routeInfo.duration)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : routeError ? (
                            <p role="alert" className="bg-slate-50 p-5 text-sm text-red-600">
                                {routeError}
                            </p>
                        ) : null}

                        {/* Directions link */}
                        <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#006dfc] transition hover:text-[#0056cc]"
                        >
                            <Navigation size={17} />
                            Get Directions
                        </a>
                    </div>

                    <p className="mt-5 text-xs text-slate-400">
                        Map data © OpenStreetMap contributors. Routes provided
                        by OSRM. Travel times are estimates and do not account
                        for live traffic.
                    </p>
                </div>
            </div>
        </section>
    )
}

export default Contact
