import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BedDouble, Check } from 'lucide-react'
import ServicesFooter, {
    type RoomGuests,
} from '../ui/InteractiveComponents/ServicesFooter'
import BookingCalendarPanel from '../ui/InteractiveComponents/BookingCalendarPanel'
import ServiceReviews from '../ui/InteractiveComponents/ServiceReviews'
import { money } from '../../../lib/format'
import { getReservationPrice } from '../../../lib/reservation'
import {
    fieldsFromStay,
    formatStayDateTime,
    getStayWindow,
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
        ),
    )
    const stayWindow = useMemo(() => getStayWindow(stayFields), [stayFields])
    const checkIn = stayWindow.checkIn
    const checkOut = stayWindow.checkOut
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
            getAvailabilityForRange(checkIn, checkOut, controller.signal)
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
    }, [checkIn, checkOut, reservationOnly, services, stayWindow.valid])

    const hasDates = stayWindow.valid
    const hasRooms = selectedStays.length > 0
    const activeBookingStep = !hasDates ? 0 : !hasRooms ? 1 : 2
    const nights = stayWindow.nights
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
    const blockedDatesScopeIds = useMemo(
        () =>
            selectedRoomIds.length > 0
                ? selectedRoomIds
                : roomChoices.map((choice) => choice.id),
        [roomChoices, selectedRoomIds],
    )
    const unavailableDates = useMemo(
        () =>
            [
                ...new Set(
                    blockedDatesScopeIds.flatMap(
                        (id) => blockedDatesByServiceId[id] ?? [],
                    ),
                ),
            ].sort(),
        [blockedDatesByServiceId, blockedDatesScopeIds],
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
            [stayFields.checkInDate, stayFields.checkOutDate].filter(
                (date) => date && unavailableDates.includes(date),
            ),
        [stayFields.checkInDate, stayFields.checkOutDate, unavailableDates],
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
        if (!hasDates || nights < 1) {
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
                    checkOut,
                    room.adults + room.kids,
                )

                return {
                    lines: summary.lines + 1,
                    total: summary.total + pricing.total,
                }
            },
            { lines: 0, total: 0 },
        )
    }, [checkIn, checkOut, hasDates, nights, roomChoices, roomGuests])

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
        showNotice(`${stay.title} added to your booking.`, 'success')
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
                    booking: { checkIn, checkOut, rooms: roomGuests },
                } satisfies ServicesRouteState,
            })
            return
        }

        if (!roomGuests.some((room) => room.stayId)) {
            showNotice('Choose a room before continuing to your reservation.')
            return
        }

        showNotice('')
        navigate('/reservation', {
            state: {
                reservation: {
                    checkIn,
                    checkOut,
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
                    <div
                        className="hide-scrollbar relative space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:py-6 lg:pr-6 lg:pl-4"
                        data-lenis-prevent
                    >
                    <BookingCalendarPanel
                        fields={stayFields}
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
                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Your selection
                                </p>
                                <h2
                                    id="selected-stays-heading"
                                    className="mt-1 text-sm font-semibold text-slate-900"
                                >
                                    {hasRooms
                                        ? `${selectedStays.length} room${
                                              selectedStays.length === 1 ? '' : 's'
                                          } ready`
                                        : 'No rooms selected yet'}
                                </h2>
                            </div>
                            <span
                                aria-hidden="true"
                                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f5f9ff] text-[#006dfc]"
                            >
                                <BedDouble className="size-5" />
                            </span>
                        </div>

                        {hasRooms ? (
                            <ul className="mt-3 space-y-2">
                                {selectedStays.slice(0, 3).map((stay) => (
                                    <li
                                        key={stay.id}
                                        className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white p-2"
                                    >
                                        <img
                                            src={stay.image || wholeVilla}
                                            alt=""
                                            loading="lazy"
                                            className="size-11 shrink-0 rounded-lg border border-slate-100 object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-semibold text-slate-800">
                                                {stay.title}
                                            </p>
                                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                                {stay.category === 'exclusive'
                                                    ? 'Whole villa'
                                                    : 'Private room'}{' '}
                                                · {money(stay.price)}/night
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-3 rounded-xl border border-dashed border-[#d7e6ff] bg-[#f5f9ff] p-3 text-[11px] leading-5 text-slate-600">
                                Pick a private room or the whole villa on the right
                                to build your stay.
                            </p>
                        )}

                        {selectedStays.length > 3 && (
                            <p className="mt-2 text-[11px] text-slate-500">
                                +{selectedStays.length - 3} more selected
                            </p>
                        )}
                        {bookingSummary.lines > 0 && (
                            <div className="mt-3 rounded-xl border border-[#d7e6ff] bg-[#f5f9ff] p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Estimated total
                                    </p>
                                    <p className="text-sm font-semibold text-[#006dfc]">
                                        {money(bookingSummary.total)}
                                    </p>
                                </div>
                                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                                    {nights} night{nights === 1 ? '' : 's'} · {bookingSummary.lines} room
                                    {bookingSummary.lines === 1 ? '' : 's'} · final amount shown at reservation
                                </p>
                            </div>
                        )}
                    </section>

                    <section
                        aria-labelledby="booking-guide-heading"
                        className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                    >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            How it works
                        </p>
                        <h2 id="booking-guide-heading" className="sr-only">
                            Booking progress
                        </h2>
                        <ol className="mt-3 space-y-3">
                            {[
                                {
                                    title: 'Set your stay time',
                                    description:
                                        'Enter check-in and check-out date and time in PHT.',
                                },
                                {
                                    title: 'Pick your rooms',
                                    description:
                                        'Select a private room or the whole villa.',
                                },
                                {
                                    title: 'Review and continue',
                                    description:
                                        'Your choices carry over to the reservation page.',
                                },
                            ].map((step, index) => {
                                const done = index < activeBookingStep
                                const active = index === activeBookingStep

                                return (
                                    <li key={step.title} className="flex gap-3">
                                        <span
                                            className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                                                done
                                                    ? 'bg-[#006dfc] text-white'
                                                    : active
                                                      ? 'border border-[#006dfc] bg-white text-[#006dfc]'
                                                      : 'bg-slate-100 text-slate-400'
                                            }`}
                                        >
                                            {done ? (
                                                <Check
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                `0${index + 1}`
                                            )}
                                        </span>
                                        <div className="min-w-0">
                                            <p
                                                className={`text-xs font-semibold ${
                                                    active || done
                                                        ? 'text-slate-900'
                                                        : 'text-slate-500'
                                                }`}
                                            >
                                                {step.title}
                                            </p>
                                            <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                                                {step.description}
                                            </p>
                                        </div>
                                    </li>
                                )
                            })}
                        </ol>
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
                        <h1 className="font-poppins text-2xl font-bold leading-tight tracking-[-0.03em] text-[#171717] sm:text-3xl">
                            Choose your stay
                        </h1>
                        <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                            Add a private room or choose the whole villa. Set your check-in and check-out date and time in PHT.
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
                                className={`min-h-11 rounded-full border px-4 py-2 text-xs font-medium shadow-sm transition sm:text-sm ${
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
                <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">
                    <strong>Booking request:</strong>{' '}
                    {formatStayDateTime(incomingBooking.checkIn)}
                    {' – '}
                    {formatStayDateTime(incomingBooking.checkOut)}
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
                onChange={updateStayFields}
                checkIn={checkIn}
                checkOut={checkOut}
                nights={nights}
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
            />
        )}
        </>
    )
}

