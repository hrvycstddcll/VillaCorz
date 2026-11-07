import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Fan } from 'lucide-react'
import ServicesFooter, {
    type RoomGuests,
} from '../ui/ServicesFooter'
import BookingCalendarPanel from '../ui/BookingCalendarPanel'
import ServiceTile from '../ui/ServiceTile'
import { guestCapacity, money } from '../../../lib/format'
import wholeVilla from '../../images/wholevilla.png'
import wholeVilla1 from '../../images/wholevilla1.png'
import wholeVilla2 from '../../images/wholevilla2.png'
import wholeVilla3 from '../../images/wholevilla3.png'
import room1 from '../../images/room1.png'
import room2 from '../../images/room2.png'
import room3 from '../../images/room3.png'
import room4 from '../../images/room4.png'
import room5 from '../../images/room5.png'
import airConditioningIcon from '../../images/AC.png'
import tvIcon from '../../images/Tv.png'
import privateBathroomIcon from '../../images/Cr.png'
import villaFont from '../../images/villafont.png'
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
    description: string
    capacity: string
    rating?: string
    badge?: string
}

const wholeVillaStay: Stay = {
    id: 'whole-villa',
    title: 'The Whole Villa',
    category: 'exclusive',
    image: wholeVilla,
    gallery: [wholeVilla, wholeVilla1, wholeVilla2, wholeVilla3, room1, room2, room3, room4, room5],
    price: 15500,
    weekendPrice: 17000,
    description:
        'Make the whole beach house yours. Gather in the shared spaces, unwind in comfortable rooms, and enjoy an easygoing seaside stay with your group.',
    capacity: 'Good for 30-35 pax',
    rating: '4.3',
    badge: 'Best Value',
}

const roomStays: Stay[] = [
    { id: 'room-1', title: 'Room 1', category: 'public', image: room1, gallery: [room1, wholeVilla1], price: 2500, weekendPrice: 3000, description: 'A cool, comfortable room with a sturdy bunk bed and room to settle in after a day by the sea.', capacity: 'Good for 2-4 pax', rating: '4.3', badge: 'Best Seller' },
    { id: 'room-2', title: 'Room 2', category: 'public', image: room2, gallery: [room2, wholeVilla2], price: 2500, weekendPrice: 3000, description: 'A bright and welcoming room for a relaxed beach-house stay.', capacity: 'Good for 2-4 pax', rating: '4.3', badge: 'Popular' },
    { id: 'room-3', title: 'Room 3', category: 'public', image: room3, gallery: [room3, wholeVilla3], price: 2500, weekendPrice: 3000, description: 'A comfortable private room with the essentials for a restful getaway.', capacity: 'Good for 2-4 pax', rating: '4.3', badge: 'Trending' },
    { id: 'room-4', title: 'Room 4', category: 'public', image: room4, gallery: [room4, wholeVilla1], price: 3500, weekendPrice: 4000, description: 'Settle into a clean, air-conditioned room close to the shared spaces.', capacity: 'Good for 6-10 pax', rating: '4.3', badge: 'Best Value' },
    { id: 'room-5', title: 'Room 5', category: 'public', image: room5, gallery: [room5, wholeVilla2], price: 3500, weekendPrice: 4000, description: 'A simple, comfortable room for a restful stay near the shore.', capacity: 'Good for 6-10 pax', rating: '4.3', badge: 'Best Value' },
]

const roomChoices = [...roomStays, wholeVillaStay]

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

const reservationAmenities = (stay: Stay) => {
    switch (stay.id) {
        case 'room-1':
        case 'room-2':
        case 'room-3':
            return 'Airconditioned, TV, private CR.'
        case 'room-4':
            return 'AC. No TV, no private CR.'
        case 'room-5':
            return 'Airconditioned, 2 fans.'
        default:
            return stay.description
    }
}

const getReservationPrice = (stay: Stay, checkIn: string, checkOut: string) => {
    const start = new Date(`${checkIn}T00:00:00Z`)
    const end = new Date(`${checkOut}T00:00:00Z`)
    const startTime = start.getTime()
    const endTime = end.getTime()

    if (
        !checkIn ||
        !checkOut ||
        !Number.isFinite(startTime) ||
        !Number.isFinite(endTime) ||
        endTime <= startTime
    ) {
        return { nights: 1, total: stay.price }
    }

    let total = 0
    let nights = 0

    for (let time = startTime; time < endTime; time += 86_400_000) {
        const day = new Date(time).getUTCDay()
        const isWeekend = day === 0 || day === 5 || day === 6
        total += isWeekend ? stay.weekendPrice ?? stay.price : stay.price
        nights += 1
    }

    return { nights, total }
}

function PublicAccommodationSection({
    selectedStay,
    onSelectStay,
    onReserve,
    checkIn,
    checkOut,
}: {
    selectedStay: Stay
    onSelectStay: (stay: Stay) => void
    onReserve: (stay: Stay) => void
    checkIn: string
    checkOut: string
}) {
    const [showAllRooms, setShowAllRooms] = useState(false)
    const [reservationStay, setReservationStay] = useState<Stay | null>(null)
    const visibleRooms = showAllRooms ? roomStays : roomStays.slice(0, 4)
    const reservationPrice = reservationStay
        ? getReservationPrice(reservationStay, checkIn, checkOut)
        : null

    return (
        <section aria-labelledby="public-title" className="mb-8 sm:mb-11">
            <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                    <h2 id="public-title" className="text-base font-bold text-[#171717] sm:text-lg">
                        Public accommodation
                    </h2>
                    <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">
                        Select a room to view its photos and details.
                    </p>
                </div>
                <span className="hidden text-[10px] text-slate-500 sm:block">
                    {roomStays.length} rooms
                </span>
            </div>

            <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 2xl:grid-cols-4">
                {visibleRooms.map((stay) => (
                    <ServiceTile
                        key={stay.id}
                        variant="room"
                        stay={stay}
                        isSelected={selectedStay.id === stay.id}
                        isReservationSelected={reservationStay?.id === stay.id}
                        onSelect={() => onSelectStay(stay)}
                        onToggleReservation={() =>
                            setReservationStay((current) =>
                                current?.id === stay.id ? null : stay,
                            )
                        }
                    />
                ))}
            </div>
            {reservationStay && reservationPrice && (
                <section
                    aria-label={`${reservationStay.title} reservation`}
                    aria-live="polite"
                    className="mt-3 grid overflow-hidden rounded-lg border border-slate-200 bg-[#f7f7f8] text-slate-600 shadow-[0_3px_12px_rgba(15,23,42,0.12)] sm:grid-cols-[1.45fr_0.55fr_1.2fr_1fr]"
                >
                    <div className="border-b border-slate-200 px-4 py-3 sm:border-b-0 sm:border-r">
                        <p className="text-[10px]">Rate</p>
                        <p className="mt-2 text-sm font-bold text-slate-700">
                            {reservationStay.title}
                        </p>
                        <p className="mt-1 text-[10px] leading-4 text-slate-600">
                            {reservationAmenities(reservationStay)} {reservationStay.capacity}.
                        </p>
                    </div>
                    <div className="border-b border-slate-200 px-4 py-3 sm:border-b-0 sm:border-r">
                        <p className="text-[10px]">Guest</p>
                        <p className="mt-4 text-xs text-slate-700">
                            {guestCapacity(reservationStay)}
                        </p>
                    </div>
                    <div className="border-b border-slate-200 px-4 py-3 sm:border-b-0 sm:border-r">
                        <p className="text-[10px]">
                            Price for {reservationPrice.nights}{' '}
                            {reservationPrice.nights === 1 ? 'night' : 'nights'}
                        </p>
                        <p className="mt-2 flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-600">
                                {money(reservationPrice.total)}
                            </span>
                        </p>
                        <p className="text-[10px] text-[#006dfc]">
                            {checkIn && checkOut ? 'based on selected dates' : 'weekdays'}
                        </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:flex-col sm:justify-center">
                        <div className="text-left sm:text-center">
                            <p className="text-[10px]">1 Room</p>
                            <p className="text-lg font-bold text-slate-600">
                                {money(reservationPrice.total)}
                            </p>
                            <p className="text-[10px]">
                                for {reservationPrice.nights}{' '}
                                {reservationPrice.nights === 1 ? 'night' : 'nights'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onReserve(reservationStay)}
                            className="rounded-md bg-[#0875f9] px-6 py-2 text-[10px] font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] transition hover:scale-105 hover:bg-blue-700 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        >
                            Reserve
                        </button>
                    </div>
                </section>
            )}
            {!showAllRooms && (
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
    selectedStay,
    activePhoto,
    onSelectStay,
    onSelectPhoto,
}: {
    selectedStay: Stay
    activePhoto: string
    onSelectStay: (stay: Stay) => void
    onSelectPhoto: (image: string) => void
}) {
    return (
        <section aria-labelledby="exclusive-title" className="mb-8 sm:mb-11">
            <div className="mb-3">
                <h2 id="exclusive-title" className="text-base font-bold text-[#171717] sm:text-lg">
                    Exclusive accommodation
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">
                    Reserve the entire property for your family, friends, or group.
                </p>
            </div>
            <ServiceTile
                variant="exclusive"
                stay={wholeVillaStay}
                isSelected={selectedStay.id === wholeVillaStay.id}
                activePhoto={activePhoto}
                gallery={wholeVillaStay.gallery}
                onSelect={() => onSelectStay(wholeVillaStay)}
                onSelectPhoto={onSelectPhoto}
            />
        </section>
    )
}

function RoomDetailView({
    stay,
    selectedPhoto,
    onSelectPhoto,
    onBack,
}: {
    stay: Stay
    selectedPhoto: string
    onSelectPhoto: (photo: string) => void
    onBack: () => void
}) {
    const gallery = [wholeVilla3, room3, villaFont]
    const description = stay.id === 'room-2'
        ? 'Offers rustic wooden bunk beds and modern comforts, including AC, TV, and a private CR, for a relaxing stay with your barkada.'
        : stay.id === 'room-3'
            ? 'Combines a warm, homey atmosphere with essential amenities like AC, TV, and a private CR, perfect for 2 to 4 guests.'
            : stay.id === 'whole-villa'
                ? 'Combines a warm, homey atmosphere with essential amenities like AC, TV, and private CRs, making it a comfortable stay for your group.'
            : stay.id === 'room-4'
                ? 'Offers warm wooden bunk beds and air-conditioned comfort, an ideal pick for guests who want a simple, peaceful retreat without the extras.'
                : stay.id === 'room-5'
                    ? 'Features a spacious, comfy bed with air conditioning and two fans, giving you budget-friendly comfort and a relaxing, easygoing stay.'
                    : 'Provides a cozy bunk-style setup with air conditioning, a TV, and a private CR, great for small groups and families.'
    const titleId = `${stay.id}-detail-title`
    const detailTitle = stay.id === 'whole-villa' ? 'Whole Villa' : stay.title

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
                <img
                    src={selectedPhoto}
                    alt={`${stay.title} interior`}
                    className="aspect-[1.65] h-full w-full object-cover md:aspect-auto md:min-h-[300px]"
                />
                <div className="flex min-w-0 flex-col p-4 sm:p-5">
                    <div>
                        <h2
                            id={titleId}
                            className="text-xl font-bold leading-tight text-[#006dfc]"
                        >
                            {detailTitle}
                        </h2>
                        <p className="mt-1 text-xs text-slate-600">
                            {stay.capacity}
                            {stay.id !== 'room-4' && stay.id !== 'room-5' && (
                                <><span className="mx-1">•</span> With AC</>
                            )}
                        </p>
                    </div>

                    <div className="mt-4">
                        <h3 className="text-sm font-semibold text-slate-700">
                            Room Features
                        </h3>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-semibold text-emerald-500 sm:text-xs">
                            {stay.id === 'whole-villa' ? (
                                <>
                                    <span className="inline-flex items-center gap-1">
                                        <img src={tvIcon} alt="" className="size-4 object-contain" />
                                        TV
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <img
                                            src={privateBathroomIcon}
                                            alt=""
                                            className="size-4 object-contain"
                                        />
                                        Private CR
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <img
                                            src={airConditioningIcon}
                                            alt=""
                                            className="size-4 object-contain"
                                        />
                                        Airconditioned
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Fan aria-hidden="true" className="size-4" />
                                        2 Fans
                                    </span>
                                </>
                            ) : stay.id === 'room-4' ? (
                                <span className="inline-flex items-center gap-1">
                                    <img
                                        src={airConditioningIcon}
                                        alt=""
                                        className="size-4 object-contain"
                                    />
                                    Airconditioned
                                </span>
                            ) : stay.id === 'room-5' ? (
                                <>
                                    <span className="inline-flex items-center gap-1">
                                        <Fan aria-hidden="true" className="size-4" />
                                        2 Fans
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <img
                                            src={airConditioningIcon}
                                            alt=""
                                            className="size-4 object-contain"
                                        />
                                        Airconditioned
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="inline-flex items-center gap-1">
                                        <img src={tvIcon} alt="" className="size-4 object-contain" />
                                        TV
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <img
                                            src={privateBathroomIcon}
                                            alt=""
                                            className="size-4 object-contain"
                                        />
                                        Private CR
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <img
                                            src={airConditioningIcon}
                                            alt=""
                                            className="size-4 object-contain"
                                        />
                                        Airconditioned
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <p className="mt-6 text-[11px] leading-5 text-slate-600">
                        {description}
                    </p>

                    {stay.id !== 'whole-villa' && stay.id !== 'room-4' && stay.id !== 'room-5' && (
                        <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
                            {gallery.map((image, index) => (
                                <button
                                    key={image}
                                    type="button"
                                    onClick={() => onSelectPhoto(image)}
                                    aria-label={`Show ${stay.title} photo ${index + 2}`}
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
    const [paymentMethod, setPaymentMethod] = useState('GCash')
    const [showPaymentMethods, setShowPaymentMethods] = useState(false)
    const [isEWalletOpen, setIsEWalletOpen] = useState(true)
    const [isBankOpen, setIsBankOpen] = useState(true)
    const [formNotice, setFormNotice] = useState('')
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
                    {assignedRooms[0] && (
                        <img
                            src={assignedRooms[0].stay.image}
                            alt={`${assignedRooms[0].stay.title} accommodation`}
                            className="h-40 w-full rounded-lg object-cover sm:h-48"
                        />
                    )}
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
                        onClick={() =>
                            setFormNotice('Payment confirmation is not connected yet.')
                        }
                        className="mt-5 min-h-11 w-full rounded-full bg-[#0875f9] px-4 text-[10px] font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                        Confirm Payment
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
                        Complete Your Details
                    </h2>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault()
                            setFormNotice('Your guest details have been saved for this reservation.')
                        }}
                    >
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <label className="border-b border-slate-300 pb-1">
                                <span className="sr-only">Name</span>
                                <input
                                    required
                                    autoComplete="given-name"
                                    placeholder="Name"
                                    className="w-full text-[10px] outline-none placeholder:font-semibold placeholder:text-slate-400"
                                />
                            </label>
                            <label className="border-b border-slate-300 pb-1">
                                <span className="sr-only">Last name</span>
                                <input
                                    required
                                    autoComplete="family-name"
                                    placeholder="Last Name"
                                    className="w-full text-[10px] outline-none placeholder:font-semibold placeholder:text-slate-400"
                                />
                            </label>
                            <label className="border-b border-slate-300 pb-1">
                                <span className="sr-only">Email</span>
                                <input
                                    required
                                    type="email"
                                    autoComplete="email"
                                    placeholder="Email"
                                    className="w-full text-[10px] outline-none placeholder:font-semibold placeholder:text-slate-400"
                                />
                            </label>
                            <label className="border-b border-slate-300 pb-1">
                                <span className="sr-only">Confirm email</span>
                                <input
                                    required
                                    type="email"
                                    placeholder="Confirm Email"
                                    className="w-full text-[10px] outline-none placeholder:font-semibold placeholder:text-slate-400"
                                />
                            </label>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-slate-600">
                                Guest Information
                            </h3>
                            <p className="text-[9px] text-slate-400">
                                Enter guest full name for each room
                            </p>
                            <div className="mt-1 max-h-52 space-y-3 overflow-y-auto pr-1">
                                {assignedRooms.map(({ room, stay }, roomIndex) => (
                                    <fieldset
                                        key={`${stay.id}-guest-${roomIndex}`}
                                        className="min-w-0"
                                    >
                                        <legend className="text-[11px] font-bold text-[#0875f9]">
                                            {stay.title}
                                        </legend>
                                        {Array.from(
                                            { length: room.adults + room.kids },
                                            (_, guestIndex) => {
                                                const guestType =
                                                    guestIndex < room.adults ? 'Adult' : 'Child'
                                                const number =
                                                    guestType === 'Adult'
                                                        ? guestIndex + 1
                                                        : guestIndex - room.adults + 1

                                                return (
                                                    <div
                                                        key={`${guestType}-${number}`}
                                                        className="mt-2"
                                                    >
                                                        <p className="mb-1 text-[8px] text-slate-500">
                                                            {guestType} #{number}
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <input
                                                                aria-label={`${stay.title} ${guestType} ${number} first name`}
                                                                placeholder="Name (optional)"
                                                                className="min-w-0 border-b border-slate-300 pb-1 text-[9px] outline-none placeholder:text-slate-400"
                                                            />
                                                            <input
                                                                aria-label={`${stay.title} ${guestType} ${number} last name`}
                                                                placeholder="Last Name (optional)"
                                                                className="min-w-0 border-b border-slate-300 pb-1 text-[9px] outline-none placeholder:text-slate-400"
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            },
                                        )}
                                    </fieldset>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 text-[8px] leading-4 text-slate-500">
                            <label className="flex items-start gap-2">
                                <input type="checkbox" className="mt-0.5 accent-[#0875f9]" />
                                <span>I would like to receive special offers from Villa Corz.</span>
                            </label>
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
                        <button
                            type="submit"
                            className="min-h-11 w-full rounded-full bg-[#0875f9] px-4 text-[10px] font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                        >
                            Continue
                        </button>
                        <p className="text-center text-[9px] font-semibold text-emerald-500">
                            Best Price Guarantee
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                setFormNotice('Account sign-in is not connected on this step.')
                            }
                            className="block w-full text-center text-[10px] font-semibold text-cyan-600 hover:underline"
                        >
                            I have an account
                        </button>
                        {formNotice && (
                            <p role="status" className="text-center text-[10px] text-slate-600">
                                {formNotice}
                            </p>
                        )}
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
    const [selectedStay, setSelectedStay] = useState<Stay>(() =>
        roomChoices.find((stay) => stay.id === incomingBooking?.rooms.find((room) => room.stayId)?.stayId)
            ?? wholeVillaStay,
    )
    const [activePhoto, setActivePhoto] = useState(selectedStay.image)
    const [isRoomDetailOpen, setIsRoomDetailOpen] = useState(false)
    const [selectedRoomPhoto, setSelectedRoomPhoto] = useState(room1)
    const [checkIn, setCheckIn] = useState(incomingBooking?.checkIn ?? '')
    const [checkOut, setCheckOut] = useState(incomingBooking?.checkOut ?? '')
    const [roomGuests, setRoomGuests] = useState<RoomGuests[]>(
        incomingBooking?.rooms ?? [{ stayId: null, adults: 2, kids: 0 }],
    )
    const [selectedRoomIndex, setSelectedRoomIndex] = useState(0)
    const [notice, setNotice] = useState('')
    const [isReservationOpen, setIsReservationOpen] = useState(false)

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
        setIsRoomDetailOpen(
            ['room-1', 'room-2', 'room-3', 'room-4', 'room-5', 'whole-villa'].includes(stay.id),
        )
    }

    const reserveStay = (stay: Stay) => {
        const alreadySelectedIndex = roomGuests.findIndex(
            (room) => room.stayId === stay.id,
        )
        if (alreadySelectedIndex !== -1) {
            setSelectedRoomIndex(alreadySelectedIndex)
            setNotice(`${stay.title} is already selected in Room ${alreadySelectedIndex + 1}.`)
            return
        }

        const targetIndex = Math.max(
            0,
            Math.min(selectedRoomIndex, roomGuests.length - 1),
        )
        setRoomGuests((current) =>
            current.length === 0
                ? [{ stayId: stay.id, adults: 2, kids: 0 }]
                : current.map((room, index) =>
                      index === targetIndex ? { ...room, stayId: stay.id } : room,
                  ),
        )
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
                {isRoomDetailOpen ? (
                    <RoomDetailView
                        stay={selectedStay}
                        selectedPhoto={selectedRoomPhoto}
                        onSelectPhoto={setSelectedRoomPhoto}
                        onBack={() => setIsRoomDetailOpen(false)}
                    />
                ) : (
                    <>
                <header className="mb-7 sm:mb-9">
                    <div>
                        <h1 className="font-poppins text-2xl font-bold leading-tight tracking-[-0.03em] text-[#171717] sm:text-3xl">
                            Room accommodation
                        </h1>
                        <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                            Choose a private room or reserve the whole beach house for your group.
                        </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Filter accommodation">
                        {[
                            { value: 'all', label: 'All' },
                            { value: 'public', label: 'Public accommodation' },
                            { value: 'exclusive', label: 'Exclusive accommodation' },
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
                        selectedStay={selectedStay}
                        onSelectStay={selectStay}
                        onReserve={reserveStay}
                        checkIn={checkIn}
                        checkOut={checkOut}
                    />
                )}

                {showExclusive && (
                    <ExclusiveAccommodationSection
                        selectedStay={selectedStay}
                        activePhoto={activePhoto}
                        onSelectStay={selectStay}
                        onSelectPhoto={(image) => {
                            setSelectedStay(wholeVillaStay)
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
