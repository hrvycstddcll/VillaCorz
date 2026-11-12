import { useEffect, useMemo, useRef, useState } from 'react'

import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Fan } from 'lucide-react'
import ServicesFooter, {
    type RoomGuests,
} from '../ui/ServicesFooter'
import BookingCalendarPanel from '../ui/BookingCalendarPanel'
import ServiceTile from '../ui/ServiceTile'
import { money } from '../../../lib/format'
import { getReservationPrice } from '../../../lib/reservation'
import { getServices } from '../../../services/serviceService'
import type { Service } from '../../../services/types'
import { useAuth } from '../../../services/useAuth'
import { getOfferPricing, getOfferBadgeLabel } from '../../../lib/pricing'
import wholeVilla from '../../images/wholevilla.png'
import airConditioningIcon from '../../images/AC.png'
import tvIcon from '../../images/Tv.png'
import privateBathroomIcon from '../../images/Cr.png'
import gcashLogo from '../../images/gcash.png'
import mayaLogo from '../../images/maya.png'
import paypalLogo from '../../images/paypal.png'
import bdoLogo from '../../images/bdo.png'
import bpiLogo from '../../images/bpi.png'
import ewalletLogo from '../../images/ewallet.png'
import onlineBankLogo from '../../images/onlinebank.png'

type StayCategory = 'public' | 'exclusive'
type BookingRequest = { checkIn: string; checkOut: string; rooms: RoomGuests[] }
type ServicesRouteState = { booking?: BookingRequest }
type Stay = {
    id: string
    title: string
    category: StayCategory
    image: string
    gallery: string[]
    price: number
    weekendPrice?: number
    originalPrice?: number
    weekendOriginalPrice?: number
    discountLabel?: string
    description: string
    amenities: string[]
    capacity: string
    rating?: string
    badge?: string
}

const exclusiveDefaults = {
    badge: 'Best Value',
    rating: '4.3',
    capacity: 'Good for 30-35 pax',
    description:
        'Make the whole beach house yours. Gather in the shared spaces, unwind in comfortable rooms, and enjoy an easygoing seaside stay with your group.',
    amenities: ['TV', 'Private CR', 'Airconditioned', '2 Fans'],
}

const toStay = (service: Service): Stay => {
    const images = [...(service.images ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
    )
    const primaryImage =
        images.find((image) => image.is_primary)?.image_url ??
        images[0]?.image_url ??
        ''
    const gallery = images.map((image) => image.image_url)
    const weekdayPricing = getOfferPricing(
        Number(service.price),
        service.weekday_discount_type,
        service.weekday_discount_value,
    )
    const weekendBase =
        service.weekend_price != null
            ? Number(service.weekend_price)
            : Number(service.price)
    const weekendPricing = getOfferPricing(
        weekendBase,
        service.weekend_discount_type,
        service.weekend_discount_value,
    )
    const pricing = {
        weekday: weekdayPricing,
        weekend: weekendPricing,
        hasDiscount: weekdayPricing.hasDiscount || weekendPricing.hasDiscount,
    }

    return {
        id: String(service.id),
        title: service.name,
        category: 'public',
        image: primaryImage,
        gallery: gallery.length > 0 ? gallery : [primaryImage],
        price: pricing.weekday.price,
        weekendPrice: pricing.weekend.price,
        originalPrice: pricing.weekday.originalPrice ?? undefined,
        weekendOriginalPrice: pricing.weekend.originalPrice ?? undefined,
        discountLabel: getOfferBadgeLabel(pricing) || undefined,
        description:
            service.description?.trim() ||
            'A comfortable room for a relaxed beach-house stay.',
        amenities: service.amenities ?? [],
        capacity:
            service.pax != null
                ? `Good for ${service.pax} pax`
                : 'Good for 2-4 pax',
    }
}

const toExclusiveStay = (service: Service): Stay => {
    const images = [...(service.images ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
    )
    const primaryImage =
        images.find((image) => image.is_primary)?.image_url ??
        images[0]?.image_url ??
        ''
    const gallery =
        images.length > 0
            ? images.map((image) => image.image_url)
            : []
    const weekdayPricing = getOfferPricing(
        Number(service.price),
        service.weekday_discount_type,
        service.weekday_discount_value,
    )
    const weekendBase =
        service.weekend_price != null
            ? Number(service.weekend_price)
            : Number(service.price)
    const weekendPricing = getOfferPricing(
        weekendBase,
        service.weekend_discount_type,
        service.weekend_discount_value,
    )
    const pricing = {
        weekday: weekdayPricing,
        weekend: weekendPricing,
        hasDiscount: weekdayPricing.hasDiscount || weekendPricing.hasDiscount,
    }

    return {
        id: String(service.id),
        title: service.name,
        category: 'exclusive',
        image: primaryImage,
        gallery,
        price: weekdayPricing.price,
        weekendPrice: weekendPricing.price,
        originalPrice: weekdayPricing.originalPrice ?? undefined,
        weekendOriginalPrice: weekendPricing.originalPrice ?? undefined,
        discountLabel: getOfferBadgeLabel(pricing) || undefined,
        description:
            service.description?.trim() || exclusiveDefaults.description,
        amenities: service.amenities ?? exclusiveDefaults.amenities,
        capacity:
            service.pax != null
                ? `Good for ${service.pax} pax`
                : exclusiveDefaults.capacity,
        rating: exclusiveDefaults.rating,
        badge: exclusiveDefaults.badge,
    }
}

const dateParts = (value: string) => {
    if (!value) return { day: '--', monthYear: 'Select date', weekday: '' }

    const date = new Date(`${value}T00:00:00`)
    return {
        day: new Intl.DateTimeFormat('en', { day: 'numeric' }).format(date),
        monthYear: new Intl.DateTimeFormat('en', {
            month: 'long',
            year: 'numeric',
        }).format(date),
        weekday: new Intl.DateTimeFormat('en', { weekday: 'long' }).format(date),
    }
}

type AmenityIcon = 'tv' | 'cr' | 'ac' | 'fan'

const amenityIcon = (amenity: string): AmenityIcon | null => {
    const value = amenity.toLowerCase()

    if (value.includes('tv') || value.includes('television')) return 'tv'
    if (
        value.includes('cr') ||
        value.includes('bath') ||
        value.includes('toilet')
    ) {
        return 'cr'
    }
    if (value.includes('fan')) return 'fan'
    if (value.includes('air') || value.includes('ac')) return 'ac'

    return null
}

function PublicAccommodationSection({
    rooms,
    loading,
    error,
    onRetry,
    selectedStay,
    selectedRoomIds,
    onSelectStay,
    onReserve,
}: {
    rooms: Stay[]
    loading: boolean
    error: string
    onRetry: () => void
    selectedStay: Stay | null
    selectedRoomIds: string[]
    onSelectStay: (stay: Stay) => void
    onReserve: (stay: Stay) => void
}) {
    const [showAllRooms, setShowAllRooms] = useState(false)
    const visibleRooms = showAllRooms ? rooms : rooms.slice(0, 4)

    return (
        <section aria-labelledby="public-title" className="mb-8 sm:mb-11">
            <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                    <h2 id="public-title" className="text-base font-bold text-[#171717] sm:text-lg">
                        Private rooms
                    </h2>
                    <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">
                        Add a room to your booking, then choose its guest count in the booking panel.
                    </p>
                </div>
                <span className="hidden text-[10px] text-slate-500 sm:block">
                    {loading ? 'Loading rooms…' : `${rooms.length} rooms`}
                </span>
            </div>

            {loading ? (
                <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 2xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-56 min-w-[72vw] animate-pulse rounded-xl bg-slate-100 sm:h-64 sm:min-w-0 lg:h-72"
                        />
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-rose-700">{error}</p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="mt-3 rounded-full bg-[#006dfc] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                    >
                        Try again
                    </button>
                </div>
            ) : rooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-600">
                        No rooms are available right now. Please check back soon.
                    </p>
                </div>
            ) : (
                <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 2xl:grid-cols-4">
                    {visibleRooms.map((stay) => (
                        <ServiceTile
                            key={stay.id}
                            variant="room"
                            stay={stay}
                            isSelected={selectedStay?.id === stay.id}
                            isReservationSelected={selectedRoomIds.includes(
                                stay.id,
                            )}
                            onSelect={() => onSelectStay(stay)}
                            onToggleReservation={() => onReserve(stay)}
                        />
                    ))}
                </div>
            )}

            {!loading && !error && rooms.length > 4 && !showAllRooms && (
                <div className="mt-1 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setShowAllRooms(true)}
                        className="rounded-full bg-white px-5 py-2 text-sm text-slate-500 shadow-[0_4px_18px_rgba(15,23,42,0.12)] transition hover:text-[#006dfc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                    >
                        Show more
                    </button>
                </div>
            )}
        </section>
    )
}

function ExclusiveAccommodationSection({
    stay,
    selectedStay,
    activePhoto,
    onSelectStay,
    onSelectPhoto,
}: {
    stay: Stay
    selectedStay: Stay | null
    activePhoto: string
    onSelectStay: (stay: Stay) => void
    onSelectPhoto: (image: string) => void
}) {
    return (
        <section aria-labelledby="exclusive-title" className="mb-8 sm:mb-11">
            <div className="mb-3">
                <h2 id="exclusive-title" className="text-base font-bold text-[#171717] sm:text-lg">
                    Whole villa
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">
                    Choose the whole villa in the booking panel to reserve it for your group.
                </p>
            </div>
            <ServiceTile
                variant="exclusive"
                stay={stay}
                isSelected={selectedStay?.id === stay.id}
                activePhoto={activePhoto}
                gallery={stay.gallery}
                onSelect={() => onSelectStay(stay)}
                onSelectPhoto={onSelectPhoto}
            />
        </section>
    )
}

function RoomDetailView({
    stay,
    selectedPhoto,
    isReservationSelected,
    onReserve,
    onSelectPhoto,
    onBack,
}: {
    stay: Stay
    selectedPhoto: string
    isReservationSelected: boolean
    onReserve: () => void
    onSelectPhoto: (photo: string) => void
    onBack: () => void
}) {
    const titleId = `${stay.id}-detail-title`
    const gallery = stay.gallery.slice(0, 3)
    const hasAmenities = stay.amenities.length > 0

    return (
        <section aria-labelledby={titleId} className="mb-8">
            <button
                type="button"
                onClick={onBack}
                className="mb-3 text-xs font-medium text-[#006dfc] transition hover:underline"
            >
                ← Back to rooms
            </button>
            <div className="grid overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.12)] md:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
                {selectedPhoto ? (
                    <img
                        src={selectedPhoto}
                        alt={`${stay.title} interior`}
                        className="aspect-[1.65] h-full w-full object-cover md:aspect-auto md:min-h-[300px]"
                    />
                ) : (
                    <div className="grid min-h-56 place-items-center bg-slate-100 text-sm text-slate-500 md:min-h-[300px]">
                        Photo unavailable
                    </div>
                )}
                <div className="flex min-w-0 flex-col p-4 sm:p-5">
                    <div>
                        <h2
                            id={titleId}
                            className="text-xl font-bold leading-tight text-[#006dfc]"
                        >
                            {stay.title}
                        </h2>
                        <p className="mt-1 text-xs text-slate-600">
                            {stay.capacity}
                        </p>
                    </div>

                    {hasAmenities && (
                        <div className="mt-4">
                            <h3 className="text-sm font-semibold text-slate-700">
                                Room Features
                            </h3>
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-semibold text-emerald-500 sm:text-xs">
                                {stay.amenities.map((amenity, index) => {
                                    const icon = amenityIcon(amenity)

                                    return (
                                        <span
                                            key={`${amenity}-${index}`}
                                            className="inline-flex items-center gap-1"
                                        >
                                            {icon === 'tv' && (
                                                <img
                                                    src={tvIcon}
                                                    alt=""
                                                    className="size-4 object-contain"
                                                />
                                            )}
                                            {icon === 'cr' && (
                                                <img
                                                    src={privateBathroomIcon}
                                                    alt=""
                                                    className="size-4 object-contain"
                                                />
                                            )}
                                            {icon === 'ac' && (
                                                <img
                                                    src={airConditioningIcon}
                                                    alt=""
                                                    className="size-4 object-contain"
                                                />
                                            )}
                                            {icon === 'fan' && (
                                                <Fan
                                                    aria-hidden="true"
                                                    className="size-4"
                                                />
                                            )}
                                            {amenity}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <p className="mt-6 text-[11px] leading-5 text-slate-600">
                        {stay.description}
                    </p>

                    <button
                        type="button"
                        onClick={onReserve}
                        disabled={isReservationSelected}
                        className="mt-5 min-h-11 rounded-lg bg-[#006dfc] px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
                    >
                        {isReservationSelected ? 'Added to booking' : 'Add to booking'}
                    </button>

                    {gallery.length > 1 && (
                        <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
                            {gallery.map((image, index) => (
                                <button
                                    key={image}
                                    type="button"
                                    onClick={() => onSelectPhoto(image)}
                                    aria-label={`Show ${stay.title} photo ${index + 1}`}
                                    aria-pressed={selectedPhoto === image}
                                    className={`overflow-hidden rounded-md ring-2 transition ${
                                        selectedPhoto === image
                                            ? 'ring-[#006dfc]'
                                            : 'ring-transparent hover:ring-slate-200'
                                    }`}
                                >
                                    <img
                                        src={image}
                                        alt=""
                                        className="aspect-[1.15] w-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

function ReservationView({
    checkIn,
    checkOut,
    roomGuests,
    roomChoices,
}: {
    checkIn: string
    checkOut: string
    roomGuests: RoomGuests[]
    roomChoices: Stay[]
}) {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [paymentMethod, setPaymentMethod] = useState('GCash')
    const [showPaymentMethods, setShowPaymentMethods] = useState(false)
    const [isEWalletOpen, setIsEWalletOpen] = useState(true)
    const [isBankOpen, setIsBankOpen] = useState(true)
    const [firstName, setFirstName] = useState(user?.firstname ?? '')
    const [lastName, setLastName] = useState(user?.lastname ?? '')
    const [email, setEmail] = useState(user?.email ?? '')
    const [phoneNumber, setPhoneNumber] = useState('')
    const detailsFormRef = useRef<HTMLFormElement>(null)
    const paymentOptions = [
        { name: 'GCash', detail: '65********9876', logo: gcashLogo },
        { name: 'Maya', detail: '65********9876', logo: mayaLogo },
        { name: 'PayPal', detail: '65********9876', logo: paypalLogo },
        { name: 'BDO', detail: 'Debit Card ********9876', logo: bdoLogo },
        { name: 'Unionbank Internet Banking', detail: 'Debit Card ********9876', logo: onlineBankLogo },
        { name: 'BPI', detail: 'Debit Card ********9876', logo: bpiLogo },
    ]
    const selectedPaymentOption = paymentOptions.find(
        (option) => option.name === paymentMethod,
    )
    const assignedRooms = roomGuests.flatMap((room) => {
        const stay = roomChoices.find((choice) => choice.id === room.stayId)
        return stay ? [{ room, stay }] : []
    })
    const nights = Math.max(
        1,
        Math.round(
            (new Date(`${checkOut}T00:00:00`).getTime() -
                new Date(`${checkIn}T00:00:00`).getTime()) /
                86_400_000,
        ),
    )
    const total = assignedRooms.reduce(
        (sum, { stay }) =>
            sum + getReservationPrice(stay, checkIn, checkOut).total,
        0,
    )
    const dateLabel = (value: string) => {
        const parts = dateParts(value)
        return `${parts.day} ${parts.weekday.slice(0, 3)} ${parts.monthYear.slice(0, 3)}`
    }

    return (
        <main className="relative min-h-svh overflow-hidden bg-slate-100 px-4 pb-10 pt-24 font-poppins sm:px-7 sm:pt-28">
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${wholeVilla})` }}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-white/65" />
            <div className="relative mx-auto grid max-w-5xl items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] md:gap-5">
                <section
                    aria-labelledby="reservation-title"
                    className="rounded-2xl bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.2)] sm:p-5"
                >
                    <h1
                        id="reservation-title"
                        className="mb-3 text-center text-sm font-bold text-slate-600"
                    >
                        Your reservation
                    </h1>
                    {assignedRooms[0] &&
                        (assignedRooms[0].stay.image ? (
                            <img
                                src={assignedRooms[0].stay.image}
                                alt={`${assignedRooms[0].stay.title} accommodation`}
                                className="h-40 w-full rounded-lg object-cover sm:h-48"
                            />
                        ) : (
                            <div
                                role="img"
                                aria-label={`${assignedRooms[0].stay.title} photo unavailable`}
                                className="grid h-40 place-items-center rounded-lg bg-slate-100 text-sm text-slate-500 sm:h-48"
                            >
                                Photo unavailable
                            </div>
                        ))}
                    <p className="mt-2 border-b border-slate-100 pb-2 text-[9px] text-slate-500">
                        Selected accommodations
                    </p>
                    <div className="grid grid-cols-4 gap-1 border-b border-slate-100 py-2 text-[9px] text-slate-600">
                        <div>
                            <span className="block">Check-in</span>
                            <strong className="text-slate-800">{dateLabel(checkIn)}</strong>
                        </div>
                        <div>
                            <span className="block">Check-out</span>
                            <strong className="text-slate-800">{dateLabel(checkOut)}</strong>
                        </div>
                        <div>
                            <span className="block">Nights</span>
                            <strong className="text-slate-800">{nights}</strong>
                        </div>
                        <div>
                            <span className="block">Guest</span>
                            <strong className="text-slate-800">
                                {roomGuests.reduce(
                                    (sum, room) => sum + room.adults + room.kids,
                                    0,
                                )}
                            </strong>
                        </div>
                    </div>

                    <div className="max-h-44 overflow-y-auto divide-y divide-slate-100">
                        {assignedRooms.map(({ room, stay }, index) => (
                            <div
                                key={`${stay.id}-${index}`}
                                className="flex items-start justify-between gap-3 py-2"
                            >
                                <div className="text-[9px] leading-4 text-slate-600">
                                    <p className="font-bold text-[#0875f9]">
                                        {stay.title} #{index + 1}
                                    </p>
                                    <p>{room.adults} Adults{room.kids ? ` · ${room.kids} Kids` : ''}</p>
                                    <p>Not refundable</p>
                                    <p>Payment Center / E-Wallet</p>
                                </div>
                                <strong className="shrink-0 text-base text-slate-600">
                                    {money(getReservationPrice(stay, checkIn, checkOut).total)}
                                </strong>
                            </div>
                        ))}
                    </div>

                    <section
                        aria-label="Selected payment method"
                        className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 p-3 shadow-[0_3px_12px_rgba(15,23,42,0.12)]"
                    >
                        <div className="flex items-center gap-2">
                            <img
                                src={selectedPaymentOption?.logo ?? ewalletLogo}
                                alt=""
                                className="size-8 object-contain"
                            />
                            <div>
                                <p className="text-xs font-bold text-slate-700">
                                    {paymentMethod}
                                </p>
                                <p className="text-[9px] text-slate-500">
                                    {selectedPaymentOption?.detail ?? 'Payment method'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowPaymentMethods(true)}
                            className="text-[10px] font-semibold text-[#0875f9] hover:underline"
                        >
                            Change
                        </button>
                    </section>
                    {showPaymentMethods && (
                        <div
                            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
                            onMouseDown={(event) => {
                                if (event.target === event.currentTarget) {
                                    setShowPaymentMethods(false)
                                }
                            }}
                        >
                            <section
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="payment-method-title"
                                className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-5"
                            >
                                <h2
                                    id="payment-method-title"
                                    className="mb-3 text-center text-sm font-bold text-slate-600"
                                >
                                    Payment Method
                                </h2>
                                <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                                    <button
                                        type="button"
                                        aria-expanded={isEWalletOpen}
                                        onClick={() => setIsEWalletOpen((open) => !open)}
                                        className="flex w-full items-center justify-between bg-slate-50 px-3 py-2 text-left text-[10px] font-semibold text-slate-700"
                                    >
                                        <span className="flex items-center gap-2">
                                            <img
                                                src={ewalletLogo}
                                                alt=""
                                                className="size-5 object-contain"
                                            />
                                            Payment Center / E-Wallet
                                        </span>
                                        {isEWalletOpen ? (
                                            <ChevronUp className="size-4" />
                                        ) : (
                                            <ChevronDown className="size-4" />
                                        )}
                                    </button>
                                    {isEWalletOpen && (
                                        <div className="px-3">
                                            {paymentOptions.slice(0, 3).map((option) => (
                                                <label
                                                    key={option.name}
                                                    className="flex cursor-pointer items-center gap-2 border-t border-slate-100 py-2"
                                                >
                                                    <img
                                                        src={option.logo}
                                                        alt=""
                                                        className="h-5 w-7 shrink-0 object-contain"
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-[10px] font-semibold leading-tight text-slate-700">
                                                            {option.name}
                                                        </span>
                                                        <span className="block text-[9px] leading-tight text-slate-500">
                                                            {option.detail}
                                                        </span>
                                                    </span>
                                                    <input
                                                        type="radio"
                                                        name="reservation-payment-method"
                                                        value={option.name}
                                                        checked={paymentMethod === option.name}
                                                        onChange={() => setPaymentMethod(option.name)}
                                                        className="size-4 accent-[#0875f9]"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                                    <button
                                        type="button"
                                        aria-expanded={isBankOpen}
                                        onClick={() => setIsBankOpen((open) => !open)}
                                        className="flex w-full items-center justify-between bg-slate-50 px-3 py-2 text-left text-[10px] font-semibold text-slate-700"
                                    >
                                        <span className="flex items-center gap-2">
                                            <img
                                                src={onlineBankLogo}
                                                alt=""
                                                className="size-5 object-contain"
                                            />
                                            Online Banking
                                        </span>
                                        {isBankOpen ? (
                                            <ChevronUp className="size-4" />
                                        ) : (
                                            <ChevronDown className="size-4" />
                                        )}
                                    </button>
                                    {isBankOpen && (
                                        <div className="px-3">
                                            {paymentOptions.slice(3).map((option) => (
                                                <label
                                                    key={option.name}
                                                    className="flex cursor-pointer items-center gap-2 border-t border-slate-100 py-2"
                                                >
                                                    <img
                                                        src={option.logo}
                                                        alt=""
                                                        className="h-5 w-7 shrink-0 object-contain"
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-[10px] font-semibold leading-tight text-slate-700">
                                                            {option.name}
                                                        </span>
                                                        <span className="block text-[9px] leading-tight text-slate-500">
                                                            {option.detail}
                                                        </span>
                                                    </span>
                                                    <input
                                                        type="radio"
                                                        name="reservation-payment-method"
                                                        value={option.name}
                                                        checked={paymentMethod === option.name}
                                                        onChange={() => setPaymentMethod(option.name)}
                                                        className="size-4 accent-[#0875f9]"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentMethods(false)}
                                    className="mt-4 min-h-10 w-full rounded-full bg-[#0875f9] text-[10px] font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] transition hover:bg-blue-700"
                                >
                                    Confirm Payment Method
                                </button>
                            </section>
                        </div>
                    )}
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 p-3 shadow-[0_3px_12px_rgba(15,23,42,0.12)]">
                        <span className="text-[10px] text-slate-600">Total payment</span>
                        <strong className="text-lg text-[#f58245]">{money(total)}</strong>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (!detailsFormRef.current?.reportValidity()) return
                            navigate('/payment', {
                                state: {
                                    checkIn,
                                    checkOut,
                                    roomGuests,
                                    roomChoices,
                                    bookingId: window.crypto.randomUUID(),
                                    firstName,
                                    lastName,
                                    email,
                                    phoneNumber,
                                    paymentMethod,
                                },
                            })
                        }}
                        className="mt-5 min-h-11 w-full rounded-full bg-[#0875f9] px-4 text-[10px] font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                        Continue to payment QR
                    </button>
                </section>

                <section
                    aria-labelledby="details-title"
                    className="rounded-2xl bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.2)] sm:p-6"
                >
                    <h2
                        id="details-title"
                        className="mb-4 text-sm font-bold text-slate-600"
                    >
                        Contact details
                    </h2>
                    <p className="mb-4 text-[10px] leading-4 text-slate-500">
                        {user
                            ? 'Your name and email are prefilled from your account. Add a phone number for this booking.'
                            : 'Enter the contact details for this booking.'}
                    </p>
                    <form
                        ref={detailsFormRef}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="block space-y-1">
                                <span className="block text-xs font-medium text-slate-600">First name <span aria-hidden="true">*</span></span>
                                <input
                                    required
                                    autoComplete="given-name"
                                    value={firstName}
                                    onChange={(event) => setFirstName(event.target.value)}
                                    readOnly={Boolean(user?.firstname)}
                                    className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#0875f9] focus:ring-1 focus:ring-[#0875f9] read-only:bg-slate-50"
                                />
                            </label>
                            <label className="block space-y-1">
                                <span className="block text-xs font-medium text-slate-600">Last name <span aria-hidden="true">*</span></span>
                                <input
                                    required
                                    autoComplete="family-name"
                                    value={lastName}
                                    onChange={(event) => setLastName(event.target.value)}
                                    readOnly={Boolean(user?.lastname)}
                                    className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#0875f9] focus:ring-1 focus:ring-[#0875f9] read-only:bg-slate-50"
                                />
                            </label>
                            <label className="block space-y-1 sm:col-span-2">
                                <span className="block text-xs font-medium text-slate-600">Email <span aria-hidden="true">*</span></span>
                                <input
                                    required
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    readOnly={Boolean(user?.email)}
                                    className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#0875f9] focus:ring-1 focus:ring-[#0875f9] read-only:bg-slate-50"
                                />
                            </label>
                        </div>
                        <label className="block space-y-1">
                            <span className="block text-xs font-medium text-slate-600">Phone number <span aria-hidden="true">*</span></span>
                            <input
                                required
                                type="tel"
                                autoComplete="tel"
                                value={phoneNumber}
                                onChange={(event) => setPhoneNumber(event.target.value)}
                                className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#0875f9] focus:ring-1 focus:ring-[#0875f9]"
                            />
                        </label>
                        <div className="text-xs leading-5 text-slate-600">
                            <label className="flex items-start gap-2">
                                <input required type="checkbox" className="mt-0.5 accent-[#0875f9]" />
                                <span>
                                    I have read the information regarding the handling of my
                                    personal data and I agree.{' '}
                                    <a href="/privacy" className="font-semibold text-[#0875f9]">
                                        Privacy Policy
                                    </a>
                                </span>
                            </label>
                        </div>
                    </form>
                </section>
            </div>
        </main>
    )
}

function Services({ bookingOnly = false }: { bookingOnly?: boolean }) {
    const navigate = useNavigate()
    const location = useLocation()
    const incomingBooking = (location.state as ServicesRouteState | null)?.booking
    const [activeFilter, setActiveFilter] = useState<'all' | StayCategory>('all')
    const [rooms, setRooms] = useState<{
        key: number
        services: Service[]
        error: string
    } | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const services = useMemo(() => rooms?.services ?? [], [rooms])
    const roomsLoading = rooms?.key !== reloadKey
    const roomsError = rooms?.key === reloadKey ? rooms.error : ''
    const [selectedStay, setSelectedStay] = useState<Stay | null>(null)
    const [activePhoto, setActivePhoto] = useState(wholeVilla)
    const [isRoomDetailOpen, setIsRoomDetailOpen] = useState(false)
    const [selectedRoomPhoto, setSelectedRoomPhoto] = useState(
        wholeVilla,
    )
    const [checkIn, setCheckIn] = useState(incomingBooking?.checkIn ?? '')
    const [checkOut, setCheckOut] = useState(incomingBooking?.checkOut ?? '')
    const [roomGuests, setRoomGuests] = useState<RoomGuests[]>(
        incomingBooking?.rooms ?? [{ stayId: null, adults: 2, kids: 0 }],
    )
    const [selectedRoomIndex, setSelectedRoomIndex] = useState(0)
    const [notice, setNotice] = useState('')
    const [isReservationOpen, setIsReservationOpen] = useState(false)

    useEffect(() => {
        let active = true

        getServices()
            .then((response) => {
                if (!active) return
                setRooms({
                    key: reloadKey,
                    services: response.data.data ?? [],
                    error: '',
                })
            })
            .catch(() => {
                if (!active) return
                setRooms({
                    key: reloadKey,
                    services: [],
                    error: 'Unable to load rooms right now. Please try again.',
                })
            })

        return () => {
            active = false
        }
    }, [reloadKey])

    const publicRooms = useMemo(
        () =>
            services
                .filter(
                    (service) =>
                        service.kind === 'room' && service.status === 'active',
                )
                .map(toStay),
        [services],
    )

    const exclusiveService = useMemo(
        () =>
            services.find(
                (service) =>
                    service.kind === 'exclusive' && service.status === 'active',
            ) ?? null,
        [services],
    )

    const exclusiveStay = useMemo(
        () =>
            exclusiveService ? toExclusiveStay(exclusiveService) : null,
        [exclusiveService],
    )

    if (exclusiveStay && selectedStay === null) {
        setSelectedStay(exclusiveStay)
        setActivePhoto(exclusiveStay.image)
        setSelectedRoomPhoto(exclusiveStay.image)
    }

    const roomChoices = useMemo(
        () => [...publicRooms, ...(exclusiveStay ? [exclusiveStay] : [])],
        [publicRooms, exclusiveStay],
    )

    const selectedRoomIds = roomGuests.flatMap((room) =>
        room.stayId ? [room.stayId] : [],
    )

    const [resolvedIncomingId, setResolvedIncomingId] = useState<string | null>(
        null,
    )
    const incomingStayId =
        incomingBooking?.rooms.find((room) => room.stayId)?.stayId ?? null

    if (incomingStayId && resolvedIncomingId !== incomingStayId) {
        const match = roomChoices.find((stay) => stay.id === incomingStayId)

        if (match) {
            setResolvedIncomingId(incomingStayId)
            setSelectedStay(match)
            setActivePhoto(match.image)
            setSelectedRoomPhoto(match.image)
        }
    }

    const nights = useMemo(() => {
        if (!checkIn || !checkOut) return 0
        const difference =
            new Date(`${checkOut}T00:00:00`).getTime() -
            new Date(`${checkIn}T00:00:00`).getTime()
        return Math.max(0, Math.round(difference / 86_400_000))
    }, [checkIn, checkOut])

    const selectStay = (stay: Stay) => {
        setSelectedStay(stay)
        setActivePhoto(stay.image)
        setSelectedRoomPhoto(stay.image)
        setNotice('')
        setIsRoomDetailOpen(true)
    }

    const reserveStay = (stay: Stay) => {
        const alreadySelectedIndex = roomGuests.findIndex(
            (room) => room.stayId === stay.id,
        )
        if (alreadySelectedIndex !== -1) {
            setSelectedRoomIndex(alreadySelectedIndex)
            setNotice(
                `${stay.title} is already selected in Room ${alreadySelectedIndex + 1}.`,
            )
            return
        }

        const emptyIndex = roomGuests.findIndex((room) => !room.stayId)
        const targetIndex = emptyIndex === -1 ? roomGuests.length : emptyIndex

        setRoomGuests((current) => {
            if (current.length === 0) {
                return [{ stayId: stay.id, adults: 2, kids: 0 }]
            }

            const empty = current.findIndex((room) => !room.stayId)

            if (empty !== -1) {
                return current.map((room, index) =>
                    index === empty ? { ...room, stayId: stay.id } : room,
                )
            }

            return [...current, { stayId: stay.id, adults: 2, kids: 0 }]
        })
        setSelectedRoomIndex(targetIndex)
        setNotice(`${stay.title} added to your booking.`)
    }

    const handleCheckAvailability = () => {
        if (!checkIn || !checkOut || nights < 1) {
            setNotice('Choose a valid check-in and check-out date to continue.')
            return
        }

        if (bookingOnly) {
            navigate('/services', {
                state: {
                    booking: { checkIn, checkOut, rooms: roomGuests },
                } satisfies ServicesRouteState,
            })
            return
        }

        if (!roomGuests.some((room) => room.stayId)) {
            setNotice('Choose a room before continuing to your reservation.')
            return
        }

        setNotice('')
        setIsReservationOpen(true)
    }

    const showPublic = activeFilter !== 'exclusive'
    const showExclusive = activeFilter !== 'public'

    return (
        <>
        {!bookingOnly && isReservationOpen && (
            <ReservationView
                checkIn={checkIn}
                checkOut={checkOut}
                roomGuests={roomGuests}
                roomChoices={roomChoices}
            />
        )}
        {!bookingOnly && !isReservationOpen && (
        <main className="min-h-svh bg-white px-4 pb-12 pt-24 font-poppins sm:px-7 sm:pt-28">
            <div className="mx-auto grid max-w-7xl items-start gap-7 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-9">
                <BookingCalendarPanel
                    checkIn={checkIn}
                    checkOut={checkOut}
                    setCheckIn={setCheckIn}
                    setCheckOut={setCheckOut}
                    roomGuests={roomGuests}
                    setRoomGuests={setRoomGuests}
                    selectedRoomIndex={selectedRoomIndex}
                    onSelectedRoomIndexChange={setSelectedRoomIndex}
                    roomChoices={roomChoices}
                    notice={notice}
                    onDateChange={() => setNotice('')}
                    onCheckAvailability={handleCheckAvailability}
                />
                <div className="min-w-0">
                {isRoomDetailOpen && selectedStay ? (
                    <RoomDetailView
                        stay={selectedStay}
                        selectedPhoto={selectedRoomPhoto}
                        isReservationSelected={selectedRoomIds.includes(selectedStay.id)}
                        onReserve={() => {
                            reserveStay(selectedStay)
                            setIsRoomDetailOpen(false)
                        }}
                        onSelectPhoto={setSelectedRoomPhoto}
                        onBack={() => setIsRoomDetailOpen(false)}
                    />
                ) : (
                    <>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#006dfc] transition hover:underline"
                >
                    ← Back
                </button>
                <header className="mb-7 sm:mb-9">
                    <div>
                        <h1 className="font-poppins text-2xl font-bold leading-tight tracking-[-0.03em] text-[#171717] sm:text-3xl">
                            Choose your stay
                        </h1>
                        <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                            Add a private room or choose the whole villa. Set dates and guest counts in the booking panel.
                        </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Filter accommodation">
                        {[
                            { value: 'all', label: 'All' },
                            { value: 'public', label: 'Private rooms' },
                            { value: 'exclusive', label: 'Whole villa' },
                        ].map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setActiveFilter(value as 'all' | StayCategory)}
                                aria-pressed={activeFilter === value}
                                className={`rounded-full border px-3 py-1.5 text-[10px] font-medium shadow-sm transition sm:px-4 sm:text-xs ${
                                    activeFilter === value
                                        ? 'border-[#006dfc] bg-[#006dfc] text-white'
                                        : 'border-slate-300/80 bg-white/75 text-slate-700 backdrop-blur-md hover:border-[#006dfc]/50 hover:text-[#006dfc]'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </header>

                {showPublic && (
                    <PublicAccommodationSection
                        rooms={publicRooms}
                        loading={roomsLoading}
                        error={roomsError}
                        onRetry={() => setReloadKey((key) => key + 1)}
                        selectedStay={selectedStay}
                        selectedRoomIds={selectedRoomIds}
                        onSelectStay={selectStay}
                        onReserve={reserveStay}
                    />
                )}

                {showExclusive && exclusiveStay && (
                    <ExclusiveAccommodationSection
                        stay={exclusiveStay}
                        selectedStay={selectedStay}
                        activePhoto={activePhoto}
                        onSelectStay={selectStay}
                        onSelectPhoto={(image) => {
                            if (exclusiveStay) setSelectedStay(exclusiveStay)
                            setActivePhoto(image)
                            setSelectedRoomPhoto(image)
                            setNotice('')
                            setIsRoomDetailOpen(false)
                        }}
                    />
                )}

                    </>
                )}
                </div>
            </div>
        </main>
        )}
        {!bookingOnly && incomingBooking && (
            <section
                aria-live="polite"
                className="mx-auto mt-24 max-w-7xl px-4 pt-6 font-poppins sm:px-7"
            >
                <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">
                    <strong>Booking request:</strong>{' '}
                    {dateParts(incomingBooking.checkIn).weekday}, {dateParts(incomingBooking.checkIn).monthYear} {dateParts(incomingBooking.checkIn).day}
                    {' – '}
                    {dateParts(incomingBooking.checkOut).weekday}, {dateParts(incomingBooking.checkOut).monthYear} {dateParts(incomingBooking.checkOut).day}
                    {' · '}
                    {incomingBooking.rooms.reduce((total, room) => total + room.adults, 0)} adults,{' '}
                    {incomingBooking.rooms.reduce((total, room) => total + room.kids, 0)} kids
                    {' · '}
                    {incomingBooking.rooms.filter((room) => room.stayId).length} room choices selected.
                </p>
            </section>
        )}
        {bookingOnly && (
            <ServicesFooter
                checkIn={checkIn}
                checkOut={checkOut}
                setCheckIn={setCheckIn}
                setCheckOut={setCheckOut}
                roomGuests={roomGuests}
                setRoomGuests={setRoomGuests}
                roomChoices={roomChoices}
                notice={notice}
                dateParts={dateParts}
                onDateChange={() => setNotice('')}
                onCheckAvailability={handleCheckAvailability}
            />
        )}
        </>
    )
}

export default Services
