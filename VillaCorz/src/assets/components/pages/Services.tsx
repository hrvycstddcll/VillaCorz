import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ServicesFooter, {
    type RoomGuests,
} from '../ui/InteractiveComponents/ServicesFooter'
import BookingCalendarPanel from '../ui/InteractiveComponents/BookingCalendarPanel'
import ServiceReviews from '../ui/InteractiveComponents/ServiceReviews'
import { money } from '../../../lib/format'
import { getReservationPrice } from '../../../lib/reservation'
import {
    fieldsFromStay,
    formatPaidDays,
    formatStayDateTime,
    getStayWindow,
    paidDayStartDates,
    PAID_DAY_HINT,
    phtToday,
    type StayDateFields,
} from '../../../lib/stayDateTime'
import {
    getAvailabilityForRange,
    getBlockedDates,
} from '../../../services/availabilityService'
import { getServices } from '../../../services/serviceService'
import type { Service } from '../../../services/types'
import wholeVilla from '../../images/wholevilla.png'
import { ExclusiveAccommodationSection } from '../services/ExclusiveAccommodationSection'
import { PublicAccommodationSection } from '../services/PublicAccommodationSection'
import { ReservationView } from '../services/ReservationView'
import { RoomDetailView } from '../services/RoomDetailView'
import {
    toExclusiveStay,
    toStay,
    type ServicesRouteState,
    type Stay,
    type StayCategory,
} from '../services/shared'

const isAbortError = (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ERR_CANCELED'

export default function Services({
    bookingOnly = false,
    reservationOnly = false,
}: {
    bookingOnly?: boolean
    reservationOnly?: boolean
}) {
    const navigate = useNavigate()
    const location = useLocation()
    const routeState = (location.state as ServicesRouteState | null) ?? null
    const incomingBooking = routeState?.booking
    const incomingReservation = routeState?.reservation
    const reviewServiceId = routeState?.reviewServiceId ?? null
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
    const [stayFields, setStayFields] = useState<StayDateFields>(() =>
        fieldsFromStay(
            incomingReservation?.checkIn ?? incomingBooking?.checkIn ?? '',
            incomingReservation?.checkOut ?? incomingBooking?.checkOut ?? '',
            incomingReservation?.paidDays ?? incomingBooking?.paidDays,
        ),
    )
    const stayWindow = useMemo(() => getStayWindow(stayFields), [stayFields])
    const checkIn = stayWindow.checkIn
    const checkOut = stayWindow.checkOut
    const paidDays = stayWindow.paidDays
    const availabilityFrom = useMemo(() => phtToday(), [])
    const availabilityTo = useMemo(() => {
        const date = new Date(`${availabilityFrom}T00:00:00Z`)
        date.setUTCDate(date.getUTCDate() + 89)
        return date.toISOString().slice(0, 10)
    }, [availabilityFrom])
    const updateStayFields = (patch: Partial<StayDateFields>) => {
        setStayFields((current) => ({ ...current, ...patch }))
        showNotice('')
        setAvailabilityByServiceId({})
        setAvailabilityError('')
        setCheckingAvailability(false)
    }
    const [roomGuests, setRoomGuests] = useState<RoomGuests[]>(
        incomingReservation?.rooms ??
            incomingBooking?.rooms ?? [{ stayId: null, adults: 2, kids: 0 }],
    )
    const [notice, setNotice] = useState('')
    const [noticeTone, setNoticeTone] = useState<'success' | 'error'>('error')
    const showNotice = (message: string, tone: 'success' | 'error' = 'error') => {
        setNotice(message)
        setNoticeTone(tone)
    }
    const [isBookingPanelOpen, setIsBookingPanelOpen] = useState(false)
    const [availabilityByServiceId, setAvailabilityByServiceId] = useState<
        Record<number, boolean>
    >({})
    const [blockedDatesByServiceId, setBlockedDatesByServiceId] = useState<
        Record<string, string[]>
    >({})
    const [availabilityError, setAvailabilityError] = useState('')
    const [blockedDatesError, setBlockedDatesError] = useState('')
    const [checkingAvailability, setCheckingAvailability] = useState(false)
    const availabilityRequestRef = useRef(0)

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

    useEffect(() => {
        if (reservationOnly && !incomingReservation) {
            navigate('/services', { replace: true })
        }
    }, [incomingReservation, navigate, reservationOnly])

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
        () =>
            incomingReservation?.roomChoices ??
            [...publicRooms, ...(exclusiveStay ? [exclusiveStay] : [])],
        [incomingReservation, publicRooms, exclusiveStay],
    )

    const selectedRoomIds = useMemo(
        () => roomGuests.flatMap((room) => (room.stayId ? [room.stayId] : [])),
        [roomGuests],
    )
    const hasSelectedRooms = selectedRoomIds.length > 0
    const selectedStays = useMemo(() => {
        return [...new Set(selectedRoomIds)].flatMap((id) => {
            const stay =
                publicRooms.find((room) => room.id === id) ??
                (exclusiveStay?.id === id ? exclusiveStay : null)
            return stay ? [stay] : []
        })
    }, [selectedRoomIds, publicRooms, exclusiveStay])

    useEffect(() => {
        if (services.length === 0 || reservationOnly) return

        const controller = new AbortController()
        let active = true

        Promise.all(
            services.map(async (service) => {
                const response = await getBlockedDates(
                    service.id,
                    availabilityFrom,
                    availabilityTo,
                    controller.signal,
                )
                return [
                    String(service.id),
                    response.data.data.unavailable_dates,
                ] as const
            }),
        )
            .then((entries) => {
                if (!active) return
                setBlockedDatesByServiceId(Object.fromEntries(entries))
                setBlockedDatesError('')
            })
            .catch((error: unknown) => {
                if (!active || isAbortError(error)) return
                setBlockedDatesByServiceId({})
                setBlockedDatesError(
                    'Unable to verify booked dates right now. Please try again.',
                )
            })

        return () => {
            active = false
            controller.abort()
        }
    }, [availabilityFrom, availabilityTo, reservationOnly, services])

    useEffect(() => {
        const requestId = ++availabilityRequestRef.current

        if (!stayWindow.valid || services.length === 0 || reservationOnly) {
            return
        }

        const controller = new AbortController()

        const timer = window.setTimeout(() => {
            setCheckingAvailability(true)
            getAvailabilityForRange(checkIn, paidDays, controller.signal)
                .then((response) => {
                    if (requestId !== availabilityRequestRef.current) return
                    const next: Record<number, boolean> = {}
                    for (const room of response.data.data.rooms) {
                        next[room.id] = room.available
                    }
                    setAvailabilityByServiceId(next)
                    setAvailabilityError('')
                })
                .catch((error: unknown) => {
                    if (isAbortError(error)) return
                    if (requestId !== availabilityRequestRef.current) return
                    setAvailabilityByServiceId({})
                    setAvailabilityError(
                        'Unable to verify room availability right now. Please try again.',
                    )
                })
                .finally(() => {
                    if (requestId === availabilityRequestRef.current) {
                        setCheckingAvailability(false)
                    }
                })
        }, 250)

        return () => {
            window.clearTimeout(timer)
            controller.abort()
        }
    }, [checkIn, paidDays, reservationOnly, services, stayWindow.valid])

    const hasDates = stayWindow.valid
    const unavailableRoomIds = useMemo(
        () =>
            availabilityError
                ? roomChoices.map((choice) => choice.id)
                : roomChoices
                      .filter(
                          (choice) =>
                              availabilityByServiceId[Number(choice.id)] === false,
                      )
                      .map((choice) => choice.id),
        [availabilityByServiceId, availabilityError, roomChoices],
    )
    const unavailableDates = useMemo(
        () =>
            [
                ...new Set(
                    selectedRoomIds.flatMap(
                        (id) => blockedDatesByServiceId[id] ?? [],
                    ),
                ),
            ].sort(),
        [blockedDatesByServiceId, selectedRoomIds],
    )
    const unavailableSelectedStays = useMemo(
        () =>
            selectedStays.filter((stay) =>
                unavailableRoomIds.includes(stay.id),
            ),
        [selectedStays, unavailableRoomIds],
    )
    const unavailableSelectedDates = useMemo(
        () =>
            paidDayStartDates(stayFields, paidDays).filter((date) =>
                unavailableDates.includes(date),
            ),
        [stayFields, paidDays, unavailableDates],
    )
    const blockedReason =
        availabilityError ||
        blockedDatesError ||
        (unavailableSelectedStays.length > 0
            ? `${unavailableSelectedStays.map((stay) => stay.title).join(', ')} already booked for these dates. Remove or replace the selected stay.`
            : '') ||
        (unavailableSelectedDates.length > 0
            ? 'One of your selected dates is already booked. Choose another date.'
            : '')

    const bookingSummary = useMemo(() => {
        if (!hasDates || paidDays < 1) {
            return { lines: 0, total: 0 }
        }

        return roomGuests.reduce(
            (summary, room) => {
                if (!room.stayId) return summary
                const stay = roomChoices.find((choice) => choice.id === room.stayId)
                if (!stay) return summary

                const pricing = getReservationPrice(
                    stay,
                    checkIn,
                    paidDays,
                    room.adults + room.kids,
                )

                return {
                    lines: summary.lines + 1,
                    total: summary.total + pricing.total,
                }
            },
            { lines: 0, total: 0 },
        )
    }, [checkIn, hasDates, paidDays, roomChoices, roomGuests])

    const assignedRooms = useMemo(
        () =>
            roomGuests
                .flatMap((room) => {
                    const stay = roomChoices.find(
                        (choice) => choice.id === room.stayId,
                    )
                    return stay ? [{ room, stay }] : []
                })
                .map(({ room, stay }, index) => ({ room, stay, index })),
        [roomChoices, roomGuests],
    )
    const assignedGuestCount = assignedRooms.reduce(
        (total, { room }) => total + room.adults + room.kids,
        0,
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

    const [resolvedReviewId, setResolvedReviewId] = useState<number | null>(null)

    if (
        reviewServiceId != null &&
        resolvedReviewId !== reviewServiceId &&
        roomChoices.length > 0
    ) {
        const match = roomChoices.find(
            (stay) => stay.id === String(reviewServiceId),
        )

        if (match) {
            setResolvedReviewId(reviewServiceId)
            setSelectedStay(match)
            setActivePhoto(match.image)
            setSelectedRoomPhoto(match.image)
            setIsRoomDetailOpen(true)
        }
    }

    const reviewsAnchorRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (resolvedReviewId == null || !isRoomDetailOpen) return

        let settled = false
        const align = () => {
            if (settled) return
            const node = reviewsAnchorRef.current
            if (!node) return
            node.scrollIntoView({ block: 'start' })
            // scroll-mt-24 keeps the anchor ~96px from the top once aligned.
            if (node.getBoundingClientRect().top <= 160) settled = true
        }

        const frame = window.requestAnimationFrame(align)
        const observer = new ResizeObserver(align)
        if (reviewsAnchorRef.current) observer.observe(reviewsAnchorRef.current)
        // The reviews load asynchronously, so keep re-aligning while the
        // section grows, then stop so later changes never move the page.
        const timeout = window.setTimeout(() => {
            align()
            settled = true
            observer.disconnect()
        }, 1500)

        return () => {
            window.cancelAnimationFrame(frame)
            window.clearTimeout(timeout)
            observer.disconnect()
        }
    }, [isRoomDetailOpen, resolvedReviewId])

    const selectStay = (stay: Stay) => {
        setSelectedStay(stay)
        setActivePhoto(stay.image)
        setSelectedRoomPhoto(stay.image)
        showNotice('')
        setIsRoomDetailOpen(true)
    }

    const reserveStay = (stay: Stay) => {
        const alreadySelectedIndex = roomGuests.findIndex(
            (room) => room.stayId === stay.id,
        )
        if (alreadySelectedIndex !== -1) {
            showNotice(
                `${stay.title} is already selected in Room ${alreadySelectedIndex + 1}.`,
            )
            return
        }

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
        showNotice(`${stay.title} added. Choose your dates next.`, 'success')
    }

    const removeStayFromBooking = (stay: Stay) => {
        setRoomGuests((current) =>
            current.filter((room) => room.stayId !== stay.id),
        )
        showNotice(`${stay.title} removed from your booking.`, 'success')
    }

    const toggleStayReservation = (stay: Stay) => {
        if (selectedRoomIds.includes(stay.id)) {
            removeStayFromBooking(stay)
            return
        }

        reserveStay(stay)
    }

    const handleCheckAvailability = () => {
        if (!hasSelectedRooms) {
            showNotice('Choose a room before choosing dates.')
            return
        }

        if (!stayWindow.valid) {
            showNotice(stayWindow.error)
            return
        }

        if (checkingAvailability) {
            showNotice('Checking live availability. Please wait.')
            return
        }

        if (availabilityError || blockedDatesError) {
            showNotice(
                availabilityError ||
                    blockedDatesError ||
                    'Unable to verify availability. Please try again.',
            )
            return
        }

        if (blockedReason) {
            showNotice(blockedReason)
            return
        }

        if (bookingOnly) {
            navigate('/services', {
                state: {
                    booking: {
                        checkIn,
                        checkOut,
                        paidDays,
                        rooms: roomGuests,
                    },
                } satisfies ServicesRouteState,
            })
            return
        }

        showNotice('')
        navigate('/reservation', {
            state: {
                    reservation: {
                        checkIn,
                        checkOut,
                        paidDays,
                        rooms: roomGuests,
                        roomChoices,
                    },
            } satisfies ServicesRouteState,
        })
    }

    const handleUnavailableDate = (date: string) => {
        showNotice(`${date} is already booked for this stay. Choose another date.`)
    }

    const showPublic = activeFilter !== 'exclusive'
    const showExclusive = activeFilter !== 'public'

    return (
        <>
        {reservationOnly && incomingReservation && (
            <ReservationView
                checkIn={incomingReservation.checkIn}
                checkOut={incomingReservation.checkOut}
                paidDays={incomingReservation.paidDays}
                roomGuests={incomingReservation.rooms}
                roomChoices={incomingReservation.roomChoices}
            />
        )}
        {!bookingOnly && !reservationOnly && (
        <main className="min-h-svh overflow-x-clip bg-white px-4 pb-32 pt-24 font-poppins sm:px-7 sm:pt-28 lg:pb-12">
            <div className="mx-auto grid max-w-7xl items-start gap-7 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-stretch lg:gap-9">
                <div className="relative min-w-0 lg:self-stretch">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-28 -bottom-12 -left-[100vw] right-0 hidden bg-[#006dfc] lg:block"
                    />
                    <div className="relative space-y-4 lg:py-6 lg:pr-6 lg:pl-4">
                    <BookingCalendarPanel
                        fields={stayFields}
                        hasSelectedRooms={hasSelectedRooms}
                        onChange={updateStayFields}
                        roomGuests={roomGuests}
                        setRoomGuests={setRoomGuests}
                        roomChoices={roomChoices}
                        notice={notice}
                        noticeTone={noticeTone}
                        unavailableRoomIds={unavailableRoomIds}
                        unavailableDates={unavailableDates}
                        blockedReason={blockedReason}
                        checkingAvailability={checkingAvailability}
                        onUnavailableDate={handleUnavailableDate}
                        isOpen={isBookingPanelOpen}
                        onOpenChange={setIsBookingPanelOpen}
                        onCheckAvailability={handleCheckAvailability}
                    />

                    <section
                        aria-labelledby="selected-stays-heading"
                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-poppins text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs lg:text-sm">
                                    Your stay
                                </p>
                                <h2
                                    id="selected-stays-heading"
                                    className="mt-1 font-jakarta text-sm font-semibold tracking-[-0.01em] text-slate-950 sm:text-base"
                                >
                                    {assignedRooms.length === 1
                                        ? '1 room in this stay'
                                        : `${assignedRooms.length} rooms in this stay`}
                                </h2>
                            </div>
                            <span
                                aria-hidden="true"
                                className="shrink-0 border-b-2 border-[#006dfc] pb-0.5 font-jakarta text-xs font-semibold tabular-nums text-[#006dfc] sm:text-sm"
                            >
                                {String(assignedRooms.length).padStart(2, '0')}
                            </span>
                        </div>

                        <div className="mt-3 border-y border-slate-100 py-2.5">
                            {hasDates ? (
                                <>
                                    <p className="font-jakarta text-xs leading-relaxed text-slate-900 sm:text-sm">
                                        {formatStayDateTime(checkIn, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                        })}
                                        <span aria-hidden="true" className="px-1.5 text-slate-300">
                                            →
                                        </span>
                                        {formatStayDateTime(checkOut, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                    <p className="mt-1 font-poppins text-[13px] leading-relaxed sm:text-sm text-slate-500">
                                        {formatPaidDays(paidDays)} · {assignedGuestCount} guest
                                        {assignedGuestCount === 1 ? '' : 's'} · PHP
                                    </p>
                                </>
                            ) : (
                                <p className="font-poppins text-[13px] leading-relaxed sm:text-sm text-slate-500">
                                    Set your dates to see room pricing.
                                </p>
                            )}
                        </div>

                        {assignedRooms.length > 0 ? (
                            <ol className="divide-y divide-slate-100">
                                {assignedRooms.slice(0, 3).map(({ room, stay, index }) => {
                                    const guests = room.adults + room.kids
                                    const lineTotal = hasDates
                                        ? getReservationPrice(stay, checkIn, paidDays, guests).total
                                        : null

                                    return (
                                        <li
                                            key={`${stay.id}-${index}`}
                                            className="flex min-w-0 items-start gap-3 py-3"
                                        >
                                            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-[#eff6ff] font-jakarta text-xs font-semibold tabular-nums text-[#006dfc] ring-1 sm:text-sm ring-inset ring-[#d7e6ff]">
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                            <img
                                                src={stay.image || wholeVilla}
                                                alt=""
                                                loading="lazy"
                                                className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-inset ring-black/5"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="break-words font-jakarta text-xs leading-relaxed text-slate-950 sm:text-sm">
                                                    {stay.title}
                                                </p>
                                                <p className="mt-1 font-poppins text-[13px] leading-relaxed sm:text-sm text-slate-500">
                                                    {stay.category === 'exclusive'
                                                        ? 'Whole villa'
                                                        : 'Private room'}{' '}
                                                    · {guests} guest{guests === 1 ? '' : 's'}
                                                </p>
                                                {unavailableRoomIds.includes(stay.id) && (
                                                    <p className="mt-1 font-poppins text-[13px] leading-relaxed text-rose-600 sm:text-sm">
                                                        Unavailable for these dates
                                                    </p>
                                                )}
                                            </div>
                                            {lineTotal !== null && (
                                                <strong className="shrink-0 font-jakarta text-xs font-semibold tabular-nums text-slate-900 sm:text-sm">
                                                    {money(lineTotal)}
                                                </strong>
                                            )}
                                        </li>
                                    )
                                })}
                            </ol>
                        ) : (
                            <p className="mt-3 font-poppins text-[13px] leading-relaxed sm:text-sm text-slate-500">
                                Rooms you add from the list will appear here.
                            </p>
                        )}

                        {assignedRooms.length > 3 && (
                            <p className="pt-2 font-poppins text-xs text-slate-500 sm:text-sm">
                                +{assignedRooms.length - 3} more rooms in this stay
                            </p>
                        )}

                        {bookingSummary.lines > 0 && (
                            <div className="mt-1 border-t border-slate-100 pt-3" aria-live="polite">
                                <div className="flex items-end justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-poppins text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs lg:text-sm">
                                            Estimated total
                                        </p>
                                        <p className="mt-1 font-poppins text-[13px] leading-relaxed sm:text-sm text-slate-500">
                                            {bookingSummary.lines} room
                                            {bookingSummary.lines === 1 ? '' : 's'} · {assignedGuestCount} guest
                                            {assignedGuestCount === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                    <strong className="shrink-0 font-jakarta text-xl font-semibold tracking-[-0.02em] tabular-nums text-[#006dfc]">
                                        {money(bookingSummary.total)}
                                    </strong>
                                </div>
                                <p className="mt-2 font-poppins text-[13px] leading-relaxed sm:text-sm text-slate-400">
                                    Final amount is confirmed on the reservation page.
                                </p>
                            </div>
                        )}
                    </section>

                    <section
                        aria-labelledby="booking-guide-heading"
                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="font-poppins text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs lg:text-sm">
                                How it works
                            </p>
                            <p className="font-poppins text-xs font-semibold text-[#006dfc] sm:text-sm">
                                2 steps
                            </p>
                        </div>
                        <h2 id="booking-guide-heading" className="sr-only">
                            Booking guide
                        </h2>
                        <p className="mt-2 font-poppins text-[13px] leading-relaxed sm:text-sm text-slate-500">
                            Choose rooms first — dates appear after your first room.
                        </p>
                        <ul className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                            {[
                                {
                                    title: 'Pick your rooms',
                                    description:
                                        'Select a private room or the whole villa.',
                                },
                                {
                                    title: 'Set arrival and paid days',
                                    description: PAID_DAY_HINT,
                                },
                                {
                                    title: 'Review and continue',
                                    description:
                                        'Your choices carry over to the reservation page.',
                                },
                            ].map((step) => (
                                <li key={step.title} className="flex gap-3">
                                    <span
                                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#006dfc]"
                                        aria-hidden="true"
                                    />
                                    <div className="min-w-0">
                                        <p className="font-jakarta text-xs font-semibold tracking-[-0.01em] text-slate-950 sm:text-sm">
                                            {step.title}
                                        </p>
                                        <p className="mt-0.5 font-poppins text-[13px] leading-relaxed sm:text-sm text-slate-500">
                                            {step.description}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                    </div>
                </div>
                <div className="min-w-0 lg:py-6" inert={isBookingPanelOpen}>
                {isRoomDetailOpen && selectedStay ? (
                    <>
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
                        <div
                            id="guest-reviews"
                            ref={reviewsAnchorRef}
                            className="mt-4 scroll-mt-24"
                        >
                            <ServiceReviews
                                serviceId={Number(selectedStay.id)}
                                averageRating={selectedStay.ratingAverage ?? null}
                                reviewsCount={selectedStay.reviewsCount ?? 0}
                                onReviewChange={() =>
                                    setReloadKey((key) => key + 1)
                                }
                            />
                        </div>
                    </>
                ) : (
                    <>
                <header className="mb-7 sm:mb-9">
                    <div>
                        <h1 className="font-jakarta text-xl font-bold leading-[1.2] tracking-[-0.02em] text-[#171717] sm:text-2xl lg:text-3xl">
                            Choose your stay
                        </h1>
                        <p className="mt-1.5 max-w-2xl font-poppins text-[13px] leading-relaxed text-slate-500 sm:text-sm lg:text-base">
                            Add a private room or choose the whole villa. Dates appear after your first room, in PHT.
                        </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter accommodation">
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
                                className={`min-h-11 rounded-full border px-4 py-2 font-poppins text-[13px] font-medium shadow-sm transition sm:text-sm lg:text-base ${
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
                        unavailableRoomIds={unavailableRoomIds}
                        onSelectStay={selectStay}
                        onReserve={toggleStayReservation}
                    />
                )}

                {showExclusive && (exclusiveStay || roomsLoading) && (
                    <ExclusiveAccommodationSection
                        stay={exclusiveStay}
                        loading={roomsLoading}
                        selectedStay={selectedStay}
                        selectedRoomIds={selectedRoomIds}
                        unavailable={
                            exclusiveStay
                                ? unavailableRoomIds.includes(exclusiveStay.id)
                                : false
                        }
                        activePhoto={activePhoto}
                        onSelectStay={selectStay}
                        onToggleReservation={toggleStayReservation}
                        onSelectPhoto={(image) => {
                            if (exclusiveStay) setSelectedStay(exclusiveStay)
                            setActivePhoto(image)
                            setSelectedRoomPhoto(image)
                            showNotice('')
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
                <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 font-poppins text-[13px] text-blue-900 sm:text-sm lg:text-base">
                    <strong className="font-jakarta">Booking request:</strong>{' '}
                    {formatStayDateTime(incomingBooking.checkIn)}
                    {' – '}
                    {formatStayDateTime(incomingBooking.checkOut)}
                    {' · '}
                    {formatPaidDays(incomingBooking.paidDays)}
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
                fields={stayFields}
                hasSelectedRooms={hasSelectedRooms}
                onChange={updateStayFields}
                checkIn={checkIn}
                checkOut={checkOut}
                paidDays={paidDays}
                roomGuests={roomGuests}
                setRoomGuests={setRoomGuests}
                roomChoices={roomChoices}
                notice={notice}
                unavailableRoomIds={unavailableRoomIds}
                unavailableDates={unavailableDates}
                blockedReason={blockedReason}
                checkingAvailability={checkingAvailability}
                onUnavailableDate={handleUnavailableDate}
                onCheckAvailability={handleCheckAvailability}
                onBrowseRooms={() => navigate('/services')}
            />
        )}
        </>
    )
}

