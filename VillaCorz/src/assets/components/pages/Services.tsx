import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    Minus,
    Plus,
    UsersRound,
} from 'lucide-react'
import wholeVilla from '../../images/wholevilla.png'
import wholeVilla1 from '../../images/wholevilla1.png'
import wholeVilla2 from '../../images/wholevilla2.png'
import wholeVilla3 from '../../images/wholevilla3.png'
import bestSellerBadge from '../../images/bestselling.png'
import room1 from '../../images/room1.png'
import room2 from '../../images/room2.png'
import room3 from '../../images/room3.png'
import room4 from '../../images/room4.png'
import room5 from '../../images/room5.png'
import star from '../../images/star.png'

type StayCategory = 'public' | 'exclusive'
type BookingPopover = 'dates' | 'guests' | null
type RoomGuests = { stayId: string | null; adults: number; kids: number }
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
    price: 17000,
    weekendPrice: 15000,
    description:
        'Make the whole beach house yours. Gather in the shared spaces, unwind in comfortable rooms, and enjoy an easygoing seaside stay with your group.',
    capacity: 'Up to 28 guests',
    rating: '4.3',
    badge: 'Best Value',
}

const roomStays: Stay[] = [
    { id: 'room-1', title: 'Room 1', category: 'public', image: room1, gallery: [room1, wholeVilla1], price: 2500, weekendPrice: 3000, description: 'A cool, comfortable room with a sturdy bunk bed and room to settle in after a day by the sea.', capacity: 'Good for 2-4 pax', rating: '4.3', badge: 'Best Seller' },
    { id: 'room-2', title: 'Room 2', category: 'public', image: room2, gallery: [room2, wholeVilla2], price: 2500, weekendPrice: 3000, description: 'A bright and welcoming room for a relaxed beach-house stay.', capacity: 'Good for 2-4 pax', rating: '4.3', badge: 'Popular' },
    { id: 'room-3', title: 'Room 3', category: 'public', image: room3, gallery: [room3, wholeVilla3], price: 2500, weekendPrice: 3000, description: 'A comfortable private room with the essentials for a restful getaway.', capacity: 'Good for 2-4 pax', rating: '4.3', badge: 'Trending' },
    { id: 'room-4', title: 'Room 4', category: 'public', image: room4, gallery: [room4, wholeVilla1], price: 2500, weekendPrice: 3000, description: 'Settle into a clean, air-conditioned room close to the shared spaces.', capacity: 'Good for 2-4 pax', rating: '4.3', badge: 'Best Value' },
    { id: 'room-5', title: 'Room 5', category: 'public', image: room5, gallery: [room5, wholeVilla2], price: 2500, weekendPrice: 3000, description: 'A simple, comfortable room for a restful stay near the shore.', capacity: 'Good for 2-4 pax', rating: '4.3', badge: 'Best Value' },
]

const roomChoices = [...roomStays, wholeVillaStay]

const money = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 0,
    }).format(amount)

const dateValue = (date: Date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    return localDate.toISOString().slice(0, 10)
}

const dateParts = (value: string) => {
    if (!value) return { day: '--', monthYear: 'Select date', weekday: '' }

    const date = new Date(`${value}T00:00:00`)
    return {
        day: new Intl.DateTimeFormat('en', { day: 'numeric' }).format(date),
        monthYear: new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date),
        weekday: new Intl.DateTimeFormat('en', { weekday: 'long' }).format(date),
    }
}

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const monthDays = (date: Date) => {
    const firstDay = startOfMonth(date)
    const offset = firstDay.getDay()
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    return [
        ...Array.from({ length: offset }, () => null),
        ...Array.from({ length: daysInMonth }, (_, index) =>
            new Date(date.getFullYear(), date.getMonth(), index + 1),
        ),
    ]
}

const monthLabel = (date: Date) =>
    new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)

function PublicAccommodationSection({
    selectedStay,
    onSelectStay,
}: {
    selectedStay: Stay
    onSelectStay: (stay: Stay) => void
}) {
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

            <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
                {roomStays.map((stay) => {
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
                                className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.03] sm:h-44"
                            />
                            {stay.badge && (
                                <span className="pointer-events-none absolute left-2 top-[58%] z-10 rounded-full bg-white/95 px-2 py-0.5 text-[8px] font-semibold leading-tight text-[#006dfc] shadow-sm sm:left-2.5 sm:px-2.5 sm:text-[9px]">
                                    {stay.badge}
                                </span>
                            )}
                            {stay.id === 'room-1' && (
                                <img
                                    src={bestSellerBadge}
                                    alt="Best seller"
                                    className="pointer-events-none absolute -left-1.5 -top-1.5 z-10 h-14 w-14 object-contain drop-shadow-md sm:h-16 sm:w-16"
                                />
                            )}
                            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 border-t border-white/20 bg-slate-950/35 px-2 py-2 text-white shadow-[0_-8px_20px_rgba(0,0,0,0.2)] backdrop-blur-[2px]">
                                <span className="min-w-0">
                                    <span className="block text-xs font-semibold leading-tight">{stay.title}</span>
                                    <span className="mt-0.5 flex items-center gap-1 truncate text-[9px] leading-tight text-white/90">
                                        <span>{stay.capacity}</span>
                                        <span aria-hidden="true">·</span>
                                        <img src={star} alt="" className="size-2.5 object-contain" />
                                        <span>{stay.rating}</span>
                                    </span>
                                    <span className="mt-1 inline-block rounded bg-white/20 px-1.5 py-0.5 text-[8px] font-medium leading-tight text-white">
                                        Weekends {money(stay.weekendPrice ?? stay.price)}
                                    </span>
                                </span>
                                <span className="shrink-0 text-right">
                                    <span className="block text-[9px] font-medium leading-tight text-white/90">Weekdays</span>
                                    <span className="block text-sm font-bold leading-tight">{money(stay.price)}</span>
                                </span>
                            </span>
                        </button>
                    )
                })}
            </div>
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
                    <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-slate-950/45 px-3 py-2.5 text-white shadow-[0_-8px_20px_rgba(0,0,0,0.2)] backdrop-blur-[2px] sm:px-4 sm:py-3">
                        <span className="min-w-0">
                            <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[8px] font-medium leading-tight text-[#006dfc] sm:text-[9px]">
                                {wholeVillaStay.badge}
                            </span>
                            <span className="mt-1 block text-xs font-semibold leading-tight sm:text-sm">Whole Villa</span>
                            <span className="mt-0.5 flex items-center gap-1 truncate text-[9px] leading-tight text-white/90">
                                <span>{wholeVillaStay.capacity}</span>
                                <span aria-hidden="true">·</span>
                                <img src={star} alt="" className="size-2.5 object-contain" />
                                <span>{wholeVillaStay.rating}</span>
                            </span>
                            <span className="mt-1 inline-block rounded bg-white/20 px-1.5 py-0.5 text-[8px] font-medium leading-tight text-white">
                                Weekends {money(wholeVillaStay.weekendPrice ?? wholeVillaStay.price)}
                            </span>
                        </span>
                        <span className="shrink-0 text-right">
                            <span className="block text-[10px] font-medium leading-tight text-white/90 sm:text-xs">Weekdays</span>
                            <span className="block text-lg font-bold leading-tight sm:text-2xl">{money(wholeVillaStay.price)}</span>
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
    const [checkIn, setCheckIn] = useState(incomingBooking?.checkIn ?? '')
    const [checkOut, setCheckOut] = useState(incomingBooking?.checkOut ?? '')
    const [roomGuests, setRoomGuests] = useState<RoomGuests[]>(
        incomingBooking?.rooms ?? [{ stayId: null, adults: 2, kids: 0 }],
    )
    const [bookingPopover, setBookingPopover] = useState<BookingPopover>(null)
    const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
    const [notice, setNotice] = useState('')

    const nights = useMemo(() => {
        if (!checkIn || !checkOut) return 0
        const difference =
            new Date(`${checkOut}T00:00:00`).getTime() -
            new Date(`${checkIn}T00:00:00`).getTime()
        return Math.max(0, Math.round(difference / 86_400_000))
    }, [checkIn, checkOut])

    const today = dateValue(new Date())
    const todayDate = new Date(`${today}T00:00:00`)
    const adults = roomGuests.reduce((total, room) => total + room.adults, 0)
    const children = roomGuests.reduce((total, room) => total + room.kids, 0)
    const assignedRooms = roomGuests.filter((room) => room.stayId !== null).length

    const selectStay = (stay: Stay) => {
        setSelectedStay(stay)
        setActivePhoto(stay.image)
        setNotice('')
    }

    const handleCheckAvailability = () => {
        setBookingPopover(null)
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

    const chooseDate = (date: Date) => {
        const value = dateValue(date)
        if (!checkIn || checkOut || value <= checkIn) {
            setCheckIn(value)
            setCheckOut('')
            setNotice('')
            return
        }

        setCheckOut(value)
        setNotice('')
        setBookingPopover(null)
    }

    const adjustCalendarMonth = (amount: number) => {
        setCalendarMonth((month) =>
            new Date(month.getFullYear(), month.getMonth() + amount, 1),
        )
    }

    const updateRoomGuests = (
        roomIndex: number,
        guestType: 'adults' | 'kids',
        amount: number,
    ) => {
        setRoomGuests((currentRooms) =>
            currentRooms.map((room, index) =>
                index === roomIndex
                    ? { ...room, [guestType]: Math.max(guestType === 'adults' ? 1 : 0, room[guestType] + amount) }
                    : room,
            ),
        )
    }

    return (
        <>
        {!bookingOnly && (
        <main className="min-h-svh bg-white px-4 pb-44 pt-24 font-poppins sm:px-7 sm:pb-36 sm:pt-28">
            <div className="mx-auto max-w-7xl">
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
                            selectStay(wholeVillaStay)
                            setActivePhoto(image)
                        }}
                    />
                )}

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
        {bookingOnly && <footer
            aria-label="Stay dates and guests"
            className="fixed inset-x-0 bottom-0 z-40 w-full bg-white px-0 pb-0 shadow-[0_-8px_24px_rgba(15,23,42,0.10)]"
        >
            <div className="grid w-full grid-cols-2 items-center gap-2 bg-white px-4 py-2.5 sm:gap-4 sm:px-7 sm:py-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_268px] lg:gap-7">
                <div className="relative col-span-2 min-w-0 lg:col-span-1">
                    <button
                        type="button"
                        aria-label="Choose check-in and check-out dates"
                        aria-haspopup="dialog"
                        aria-expanded={bookingPopover === 'dates'}
                        onClick={() => {
                            setCalendarMonth(startOfMonth(checkIn ? new Date(`${checkIn}T00:00:00`) : new Date()))
                            setBookingPopover(bookingPopover === 'dates' ? null : 'dates')
                        }}
                        className="grid w-full min-w-0 grid-cols-[36px_minmax(0,1fr)_1px_minmax(0,1fr)_1px_44px] items-center gap-2 bg-[#f1f1f3] px-2 py-2 text-left sm:grid-cols-[48px_minmax(0,1fr)_1px_minmax(0,1fr)_1px_62px] sm:gap-3 sm:px-4 sm:py-3"
                    >
                        <span className="flex size-9 items-center justify-center rounded-full bg-[#0875f9] text-white sm:size-11">
                            <CalendarDays className="size-5 sm:size-6" aria-hidden="true" />
                        </span>
                        <span className="flex min-w-0 items-center gap-1">
                            <span className="text-xl font-bold leading-none text-slate-500 sm:text-2xl">{dateParts(checkIn).day}</span>
                            <span className="min-w-0">
                                <span className="block text-[9px] leading-tight text-slate-600 sm:text-xs">Check-in</span>
                                <span className="block truncate text-[8px] font-bold uppercase leading-tight text-slate-600 sm:text-[9px]">{dateParts(checkIn).monthYear}</span>
                                <span className="block truncate text-[8px] leading-tight text-slate-500 sm:text-[9px]">{dateParts(checkIn).weekday || 'Choose a date'}</span>
                            </span>
                        </span>
                        <span className="h-7 w-px bg-slate-400/70" aria-hidden="true" />
                        <span className="flex min-w-0 items-center gap-1">
                            <span className="text-xl font-bold leading-none text-slate-500 sm:text-2xl">{dateParts(checkOut).day}</span>
                            <span className="min-w-0">
                                <span className="block text-[9px] leading-tight text-slate-600 sm:text-xs">Check-out</span>
                                <span className="block truncate text-[8px] font-bold uppercase leading-tight text-slate-600 sm:text-[9px]">{dateParts(checkOut).monthYear}</span>
                                <span className="block truncate text-[8px] leading-tight text-slate-500 sm:text-[9px]">{dateParts(checkOut).weekday || 'Choose a date'}</span>
                            </span>
                        </span>
                        <span className="h-7 w-px bg-slate-400/70" aria-hidden="true" />
                        <span className="min-w-0 text-center">
                            <span className="block text-[9px] text-slate-600 sm:text-xs">Nights</span>
                            <span className="block text-sm font-bold text-slate-600 sm:text-base">{nights}</span>
                        </span>
                    </button>
                    {bookingPopover === 'dates' && (
                        <div
                            role="dialog"
                            aria-label="Choose your stay dates"
                            className="absolute bottom-full left-0 z-50 mb-3 w-[min(94vw,700px)] rounded-lg border border-slate-200 bg-white p-3 shadow-xl sm:p-4"
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-700 sm:text-sm">
                                    {checkIn && !checkOut ? 'Select check-out date' : 'Select check-in date'}
                                </p>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => adjustCalendarMonth(-1)}
                                        disabled={calendarMonth <= startOfMonth(todayDate)}
                                        aria-label="Previous month"
                                        className="flex size-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 enabled:hover:bg-slate-100 disabled:opacity-40"
                                    >
                                        <ChevronLeft className="size-4" aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => adjustCalendarMonth(1)}
                                        aria-label="Next month"
                                        className="flex size-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                                    >
                                        <ChevronRight className="size-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                                {[0, 1].map((monthOffset) => {
                                    const month = new Date(
                                        calendarMonth.getFullYear(),
                                        calendarMonth.getMonth() + monthOffset,
                                        1,
                                    )
                                    return (
                                        <div key={month.toISOString()}>
                                            <h3 className="mb-2 text-center text-[11px] font-semibold text-slate-700 sm:text-xs">
                                                {monthLabel(month)}
                                            </h3>
                                            <div className="grid grid-cols-7 gap-y-1 text-center">
                                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                                    <span key={day} className="py-1 text-[9px] font-medium text-slate-500">{day}</span>
                                                ))}
                                                {monthDays(month).map((day, index) => {
                                                    if (!day) return <span key={`empty-${index}`} />
                                                    const value = dateValue(day)
                                                    const selected = value === checkIn || value === checkOut
                                                    const inRange = Boolean(checkIn && checkOut && value > checkIn && value < checkOut)
                                                    const disabled = value < today
                                                    return (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            disabled={disabled}
                                                            onClick={() => chooseDate(day)}
                                                            aria-label={new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(day)}
                                                            aria-pressed={selected}
                                                            className={`mx-auto flex size-7 items-center justify-center rounded-full text-[10px] transition sm:size-8 sm:text-[11px] ${
                                                                selected
                                                                    ? 'bg-[#0875f9] font-semibold text-white'
                                                                    : inRange
                                                                      ? 'bg-blue-50 text-[#0875f9]'
                                                                      : 'text-slate-700 hover:bg-blue-50 hover:text-[#0875f9]'
                                                            } disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent`}
                                                        >
                                                            {day.getDate()}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setBookingPopover(null)}
                                    className="rounded px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBookingPopover(null)}
                                    className="rounded bg-[#0875f9] px-4 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="relative min-w-0">
                    <button
                        type="button"
                        aria-label="Choose rooms, adults, and children"
                        aria-haspopup="dialog"
                        aria-expanded={bookingPopover === 'guests'}
                        onClick={() => setBookingPopover(bookingPopover === 'guests' ? null : 'guests')}
                        className="flex w-full min-w-0 items-center gap-2 border-l border-slate-200 pl-2 text-left sm:gap-3 sm:pl-4"
                    >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0875f9] text-white sm:size-11">
                            <UsersRound className="size-5 sm:size-6" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[10px] text-slate-600 sm:text-xs">Persons</span>
                            <span className="flex items-center gap-1">
                                <span className="text-xl font-bold leading-none text-slate-500 sm:text-2xl">{adults}</span>
                                <span className="block min-w-0 text-[8px] font-bold uppercase leading-tight text-slate-600 sm:text-[9px]">
                                    Adults · +{children} kids
                                    <span className="block font-normal normal-case">Rooms: {assignedRooms} selected</span>
                                </span>
                            </span>
                        </span>
                    </button>
                    {bookingPopover === 'guests' && (
                        <div
                            role="dialog"
                            aria-label="Choose rooms and guests"
                            className="absolute bottom-full right-0 z-50 mb-3 w-[min(92vw,320px)] rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
                        >
                            <div className="max-h-[min(55vh,360px)] space-y-3 overflow-y-auto pr-1">
                                {roomGuests.map((room, roomIndex) => (
                                    <section
                                        key={roomIndex}
                                        aria-label={room.stayId
                                            ? `Guests for ${roomChoices.find((choice) => choice.id === room.stayId)?.title ?? 'selected room'}`
                                            : 'Choose a preferred room for these guests'}
                                        className="border-b border-slate-100 pb-3 last:border-0"
                                    >
                                        <div className="mb-1 flex items-center justify-between">
                                            <h3 className="text-[11px] font-medium text-slate-600">
                                                {room.stayId
                                                    ? `Guests for ${roomChoices.find((choice) => choice.id === room.stayId)?.title ?? 'selected room'}`
                                                    : 'Choose a room preference'}
                                            </h3>
                                            {roomGuests.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setRoomGuests((currentRooms) =>
                                                            currentRooms.filter((_, index) => index !== roomIndex),
                                                        )
                                                    }
                                                    className="text-[10px] font-medium text-slate-500 hover:text-red-600"
                                                >
                                                    Remove room
                                                </button>
                                            )}
                                        </div>
                                        <label className="mb-2 block">
                                            <span className="sr-only">Preferred accommodation</span>
                                            <select
                                                value={room.stayId ?? ''}
                                                onChange={(event) =>
                                                    setRoomGuests((currentRooms) =>
                                                        currentRooms.map((currentRoom, index) =>
                                                            index === roomIndex
                                                                ? { ...currentRoom, stayId: event.target.value || null }
                                                                : currentRoom,
                                                        ),
                                                    )
                                                }
                                                className="w-full rounded border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-700 outline-none focus:border-[#0875f9] focus:ring-1 focus:ring-[#0875f9]"
                                            >
                                                <option value="">Select a preferred room</option>
                                                {roomChoices.map((choice) => {
                                                    const selectedElsewhere = roomGuests.some(
                                                        (otherRoom, index) =>
                                                            index !== roomIndex && otherRoom.stayId === choice.id,
                                                    )
                                                    const villaAssignedElsewhere = roomGuests.some(
                                                        (otherRoom, index) =>
                                                            index !== roomIndex && otherRoom.stayId === wholeVillaStay.id,
                                                    )
                                                    const otherRoomsAssigned = roomGuests.some(
                                                        (otherRoom, index) =>
                                                            index !== roomIndex &&
                                                            otherRoom.stayId !== null &&
                                                            otherRoom.stayId !== wholeVillaStay.id,
                                                    )
                                                    return (
                                                        <option
                                                            key={choice.id}
                                                            value={choice.id}
                                                            disabled={
                                                                selectedElsewhere ||
                                                                (choice.id === wholeVillaStay.id && otherRoomsAssigned) ||
                                                                (choice.id !== wholeVillaStay.id && villaAssignedElsewhere)
                                                            }
                                                        >
                                                            {choice.title}
                                                        </option>
                                                    )
                                                })}
                                            </select>
                                        </label>
                                        {([
                                            { label: 'Adults', key: 'adults' as const },
                                            { label: 'Kids', key: 'kids' as const },
                                        ]).map(({ label, key }) => (
                                            <div key={key} className="flex items-center justify-between py-1">
                                                <span className="text-xs font-semibold text-slate-700">
                                                    {room[key]} {label}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateRoomGuests(roomIndex, key, -1)}
                                                        disabled={key === 'adults' ? room.adults <= 1 : room.kids <= 0}
                                                        aria-label={`Remove one ${label.toLowerCase()} from guest group ${roomIndex + 1}`}
                                                        className="flex size-7 items-center justify-center rounded-full border border-[#0875f9] text-[#0875f9] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <Minus className="size-3.5" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateRoomGuests(roomIndex, key, 1)}
                                                        aria-label={`Add one ${label.toLowerCase()} to guest group ${roomIndex + 1}`}
                                                        className="flex size-7 items-center justify-center rounded-full border border-[#0875f9] text-[#0875f9] hover:bg-blue-50"
                                                    >
                                                        <Plus className="size-3.5" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                ))}
                            </div>
                            <button
                                type="button"
                                disabled={roomGuests.some((room) => room.stayId === wholeVillaStay.id) ||
                                    roomStays.every((stay) => roomGuests.some((room) => room.stayId === stay.id))}
                                onClick={() => setRoomGuests((currentRooms) => [...currentRooms, { stayId: null, adults: 2, kids: 0 }])}
                                className="mt-2 text-[10px] font-semibold text-[#0875f9] hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                + Add room choice
                            </button>
                            <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setBookingPopover(null)}
                                    className="rounded px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBookingPopover(null)}
                                    className="rounded bg-[#0875f9] px-4 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleCheckAvailability}
                    className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-sm bg-[#2875e8] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1763d4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006dfc] focus-visible:ring-offset-2 sm:min-h-12 lg:col-span-1 lg:min-h-[66px] lg:text-lg"
                >
                    Check availability
                </button>
                {notice && (
                    <p
                        role="status"
                        className="col-span-2 flex items-start gap-2 rounded-lg bg-blue-50 p-2.5 text-[10px] leading-4 text-blue-800 lg:col-span-3"
                    >
                        <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        {notice}
                    </p>
                )}
            </div>
        </footer>}
        </>
    )
}

export default Services
