import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Fan } from 'lucide-react'
import ServicesFooter, {
    type RoomGuests,
} from '../ui/ServicesFooter'
import BookingCalendarPanel from '../ui/BookingCalendarPanel'
import wholeVilla from '../../images/wholevilla.png'
import wholeVilla1 from '../../images/wholevilla1.png'
import wholeVilla2 from '../../images/wholevilla2.png'
import wholeVilla3 from '../../images/wholevilla3.png'
import bestSellerBadge from '../../images/bestselling.png'
import discountBadge from '../../images/discount-20.png'
import room1 from '../../images/room1.png'
import room2 from '../../images/room2.png'
import room3 from '../../images/room3.png'
import room4 from '../../images/room4.png'
import room5 from '../../images/room5.png'
import star from '../../images/star.png'
import airConditioningIcon from '../../images/AC.png'
import tvIcon from '../../images/Tv.png'
import privateBathroomIcon from '../../images/Cr.png'
import villaFont from '../../images/villafont.png'

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

const money = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0,
    }).format(amount)

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

function PublicAccommodationSection({
    selectedStay,
    onSelectStay,
}: {
    selectedStay: Stay
    onSelectStay: (stay: Stay) => void
}) {
    const [showAllRooms, setShowAllRooms] = useState(false)
    const visibleRooms = showAllRooms ? roomStays : roomStays.slice(0, 4)

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
                {visibleRooms.map((stay) => {
                    const isSelected = selectedStay.id === stay.id
                    return (
                        <button
                            key={stay.id}
                            type="button"
                            onClick={() => onSelectStay(stay)}
                            aria-pressed={isSelected}
                            className={`group relative min-w-[72vw] snap-start overflow-hidden rounded-xl bg-white text-left shadow-md ring-1 transition hover:-translate-y-0.5 hover:shadow-lg sm:min-w-0 ${
                                isSelected ? 'ring-2 ring-[#006dfc]' : 'ring-black/5'
                            }`}
                        >
                            <img
                                src={stay.image}
                                alt={`${stay.title} interior`}
                                className="h-56 w-full scale-[1.05] object-cover transition duration-500 group-hover:scale-[1.08] sm:h-64 lg:h-72"
                            />
                            <img
                                src={discountBadge}
                                alt="20% off"
                                className="pointer-events-none absolute right-0 top-0 z-10 h-14 w-14 object-contain sm:h-16 sm:w-16"
                            />
                            {stay.id === 'room-1' ? (
                                <img
                                    src={bestSellerBadge}
                                    alt="Best seller"
                                    className="pointer-events-none absolute -left-1 -top-1 z-20 h-14 w-14 object-contain drop-shadow-md sm:h-16 sm:w-16"
                                />
                            ) : stay.badge ? (
                                <span className="pointer-events-none absolute right-2 top-[46%] z-20 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-semibold leading-tight text-[#006dfc] shadow-sm sm:text-[10px]">
                                    {stay.badge}
                                </span>
                            ) : null}
                            <span className="absolute inset-x-0 bottom-0 top-[63%] flex items-end justify-between gap-2 border-t border-white/25 bg-white/20 px-2 pb-2 pt-3 text-white shadow-[0_-8px_20px_rgba(0,0,0,0.16)] backdrop-blur-[3px] sm:px-2.5">
                                <span className="absolute left-0 top-0 inline-flex max-w-[55%] items-center gap-2 bg-white px-1.5 py-1 text-[#006dfc] shadow-sm sm:px-2">
                                    <span className="shrink-0 text-left text-[8px] font-semibold italic leading-[1.05] sm:text-[9px]">
                                        Weekdays
                                        <span className="block text-[7px] font-medium">Mon - Thu</span>
                                    </span>
                                    <span className="min-w-0 text-right">
                                        <span className="block text-[6px] italic leading-none sm:text-[7px]">
                                            For only
                                        </span>
                                        <span className="block whitespace-nowrap text-xs font-bold leading-none sm:text-sm">
                                            {money(stay.price)}
                                        </span>
                                    </span>
                                </span>
                                <span className="absolute left-2 top-7 min-w-0 text-left sm:left-2.5 sm:top-8">
                                    <span className="block text-xs font-bold leading-tight sm:text-sm">
                                        {stay.title}
                                    </span>
                                    <span className="flex items-center gap-1 truncate text-[8px] leading-tight text-white/95 sm:text-[9px]">
                                        <span>{stay.capacity}</span>
                                        <img src={star} alt="" className="size-3 shrink-0 object-contain" />
                                        <span>{stay.rating}</span>
                                    </span>
                                </span>
                                <span className="absolute bottom-2 right-2 flex shrink-0 flex-col items-end gap-1.5 sm:right-2.5">
                                    <span className="rounded-md bg-white/35 px-2 py-0.5 text-center text-white shadow-sm backdrop-blur-sm sm:px-3 sm:py-1">
                                        <span className="block text-[7px] font-medium leading-tight sm:text-[8px]">
                                            Weekends
                                        </span>
                                        <span className="block text-xs font-bold leading-tight sm:text-sm">
                                            {money(stay.weekendPrice ?? stay.price)}
                                        </span>
                                    </span>
                                    <span className="rounded-md bg-white px-2.5 py-1.5 text-[9px] font-semibold text-[#006dfc] shadow-sm sm:px-3 sm:text-[10px]">
                                        Select room
                                    </span>
                                </span>
                            </span>
                        </button>
                    )
                })}
            </div>
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
            <div className="group relative overflow-hidden rounded-xl shadow-md ring-1 ring-black/5">
                <button
                    type="button"
                    onClick={() => onSelectStay(wholeVillaStay)}
                    aria-pressed={selectedStay.id === wholeVillaStay.id}
                    aria-label="Select the whole villa"
                    className="block w-full text-left"
                >
                    <img
                        src={selectedStay.category === 'exclusive' ? activePhoto : wholeVilla}
                        alt="Blue-roofed Villa Corz beach house"
                        className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.01] sm:h-64 lg:h-72"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex h-[35%] items-end justify-between gap-2 border-t border-white/25 bg-white/20 px-2 pb-1 pt-1 text-white shadow-[0_-8px_20px_rgba(0,0,0,0.16)] backdrop-blur-[3px] sm:px-2.5">
                        <span className="absolute left-0 top-0 inline-flex h-8 w-[34%] min-w-55 max-w-90 items-center justify-between gap-2 bg-white px-3 py-0.5 text-[#006dfc] shadow-sm sm:h-10 sm:px-3.5 sm:py-1">
                            <span className="shrink-0 text-left text-[11px] font-semibold italic leading-[1.05] sm:text-sm">
                                Weekdays
                                <span className="block text-[9px] font-medium sm:text-[10px]">Mon - Thu</span>
                            </span>
                            <span className="min-w-0 text-right">
                                <span className="block text-[8px] italic leading-none sm:text-[9px]">
                                    For only
                                </span>
                                <span className="block whitespace-nowrap text-lg font-bold leading-none sm:text-2xl">
                                    {money(wholeVillaStay.price)}
                                </span>
                            </span>
                        </span>
                        <span className="absolute right-2 -top-9 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-semibold text-[#006dfc] shadow-sm sm:right-3 sm:text-[10px]">
                            {wholeVillaStay.badge}
                        </span>
                        <span className="flex min-w-0 flex-col items-start gap-0.5 pt-7">
                            <span className="block text-xs font-bold leading-tight sm:text-sm">
                                Whole Villa
                            </span>
                            <span className="flex items-center gap-1 truncate text-[8px] leading-tight text-white/95 sm:text-[9px]">
                                <span>{wholeVillaStay.capacity}</span>
                                <img src={star} alt="" className="size-3 shrink-0 object-contain" />
                                <span>{wholeVillaStay.rating}</span>
                            </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                            <span className="rounded-md bg-white/35 px-2 py-0.5 text-center text-white shadow-sm backdrop-blur-sm sm:px-3">
                                <span className="block text-[7px] font-medium leading-tight sm:text-[8px]">
                                    Weekends
                                </span>
                                <span className="block text-xs font-bold leading-tight sm:text-sm">
                                    {money(wholeVillaStay.weekendPrice ?? wholeVillaStay.price)}
                                </span>
                            </span>
                            <span className="rounded-md bg-white px-2.5 py-1 text-[9px] font-semibold text-[#006dfc] shadow-sm sm:px-3 sm:text-[10px]">
                                Select room
                            </span>
                        </span>
                    </span>
                </button>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                {wholeVillaStay.gallery.map((image, index) => (
                    <button
                        key={image}
                        type="button"
                        onClick={() => onSelectPhoto(image)}
                        aria-label={`Show whole villa photo ${index + 1}`}
                        aria-pressed={selectedStay.category === 'exclusive' && activePhoto === image}
                        className={`shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                            selectedStay.category === 'exclusive' && activePhoto === image
                                ? 'ring-[#006dfc]'
                                : 'ring-transparent'
                        }`}
                    >
                        <img src={image} alt="" className="h-14 w-20 object-cover sm:h-16 sm:w-24" />
                    </button>
                ))}
            </div>
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
    const [notice, setNotice] = useState('')

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

        setNotice(
            'Your stay details are ready. Online availability confirmation is not connected yet.',
        )
    }

    const showPublic = activeFilter !== 'exclusive'
    const showExclusive = activeFilter !== 'public'

    return (
        <>
        {!bookingOnly && (
        <main className="min-h-svh bg-white px-4 pb-12 pt-24 font-poppins sm:px-7 sm:pt-28">
            <div className="mx-auto grid max-w-7xl items-start gap-7 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-9">
                <BookingCalendarPanel
                    checkIn={checkIn}
                    checkOut={checkOut}
                    setCheckIn={setCheckIn}
                    setCheckOut={setCheckOut}
                    roomGuests={roomGuests}
                    setRoomGuests={setRoomGuests}
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
