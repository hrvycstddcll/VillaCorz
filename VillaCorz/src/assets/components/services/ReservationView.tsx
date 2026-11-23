import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { RoomGuests } from '../ui/InteractiveComponents/ServicesFooter'
import PhoneNumberInput from '../ui/FormComponents/PhoneNumberInput'
import SavePhoneModal from '../ui/ModalComponents/SavePhoneModal'
import CancellationPolicyModal from '../ui/ModalComponents/CancellationPolicyModal'
import { money } from '../../../lib/format'
import { getApiErrorMessage } from '../../../lib/apiError'
import { getReservationPrice } from '../../../lib/reservation'
import { formatPhoneNumber, maskPhoneNumber, normalizePhoneNumber } from '../../../lib/phoneNumber'
import { createBooking } from '../../../services/bookingService'
import { addAccountPhoneNumber } from '../../../services/phoneNumberService'
import { useAuth } from '../../../services/useAuth'
const wholeVilla = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364279/villacorz/ui/src/assets/images/wholevilla.png'
const gcashLogo = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364193/villacorz/ui/src/assets/images/gcash.png'
const mayaLogo = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364197/villacorz/ui/src/assets/images/maya.png'
const paypalLogo = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364201/villacorz/ui/src/assets/images/paypal.png'
const bdoLogo = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364146/villacorz/ui/src/assets/images/bdo.png'
const bpiLogo = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364154/villacorz/ui/src/assets/images/bpi.png'
const ewalletLogo = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364175/villacorz/ui/src/assets/images/ewallet.png'
const onlineBankLogo = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364198/villacorz/ui/src/assets/images/onlinebank.png'
import { type ServicesRouteState, type Stay } from './shared'
import {
    fieldsFromStay,
    formatPaidDays,
    formatStayDateTime,
    getStayWindow,
} from '../../../lib/stayDateTime'

export function ReservationView({
    checkIn,
    checkOut,
    paidDays,
    roomGuests,
    roomChoices,
}: {
    checkIn: string
    checkOut: string
    paidDays: number
    roomGuests: RoomGuests[]
    roomChoices: Stay[]
}) {
    const { user, setUser } = useAuth()
    const navigate = useNavigate()
    const [paymentMethod, setPaymentMethod] = useState('GCash')
    const [showPaymentMethods, setShowPaymentMethods] = useState(false)
    const [isEWalletOpen, setIsEWalletOpen] = useState(true)
    const [isBankOpen, setIsBankOpen] = useState(true)
    const [firstName, setFirstName] = useState(user?.firstname ?? '')
    const [lastName, setLastName] = useState(user?.lastname ?? '')
    const [email, setEmail] = useState(user?.email ?? '')
    const savedNumbers = useMemo(() => user?.phone_numbers ?? [], [user])
    const defaultSavedNumber =
        savedNumbers.find((phone) => phone.is_primary) ?? savedNumbers[0]
    const [phoneChoice, setPhoneChoice] = useState(
        defaultSavedNumber ? String(defaultSavedNumber.id) : 'new',
    )
    const [customPhoneNumber, setCustomPhoneNumber] = useState('')
    const [savePromptNumber, setSavePromptNumber] = useState('')
    const [showCancellationPolicy, setShowCancellationPolicy] = useState(false)
    const [pendingBookingNumber, setPendingBookingNumber] = useState('')
    const [isSavingPhone, setIsSavingPhone] = useState(false)
    const [savePhoneError, setSavePhoneError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const detailsFormRef = useRef<HTMLFormElement>(null)
    const paymentMethodDialogRef = useRef<HTMLElement>(null)
    const bookingKeyRef = useRef<string>('')
    const usingSavedNumber = phoneChoice !== 'new'
    const selectedSavedNumber = usingSavedNumber
        ? savedNumbers.find((phone) => String(phone.id) === phoneChoice)
        : undefined
    const contactPhone = usingSavedNumber
        ? (selectedSavedNumber?.phone_number ?? '')
        : customPhoneNumber.trim()
    const linkedPaymentNumber =
        selectedSavedNumber ??
        savedNumbers.find((phone) => phone.is_primary) ??
        savedNumbers[0]
    const maskedPaymentNumber = linkedPaymentNumber
        ? maskPhoneNumber(linkedPaymentNumber.phone_number)
        : ''
    // The number line is display-only: a masked value, or a plain prompt when
    // nothing is linked. It is never an editable field.
    const paymentDetail = maskedPaymentNumber || 'No mobile number linked'
    const paymentOptions = [
        { name: 'GCash', detail: paymentDetail, logo: gcashLogo },
        { name: 'Maya', detail: paymentDetail, logo: mayaLogo },
        { name: 'PayPal', detail: paymentDetail, logo: paypalLogo },
        { name: 'BDO', detail: paymentDetail, logo: bdoLogo },
        { name: 'Unionbank Internet Banking', detail: paymentDetail, logo: onlineBankLogo },
        { name: 'BPI', detail: paymentDetail, logo: bpiLogo },
    ]
    const selectedPaymentOption = paymentOptions.find(
        (option) => option.name === paymentMethod,
    )
    const assignedRooms = roomGuests.flatMap((room) => {
        const stay = roomChoices.find((choice) => choice.id === room.stayId)
        return stay ? [{ room, stay }] : []
    })
    const stayWindow = useMemo(
        () => getStayWindow(fieldsFromStay(checkIn, checkOut, paidDays)),
        [checkIn, checkOut, paidDays],
    )
    const total = assignedRooms.reduce(
        (sum, { room, stay }) =>
            sum +
            getReservationPrice(
                stay,
                checkIn,
                stayWindow.paidDays,
                room.adults + room.kids,
            ).total,
        0,
    )

    useEffect(() => {
        if (!showPaymentMethods) return

        const dialog = paymentMethodDialogRef.current
        if (!dialog) return

        const previousFocus =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null
        const previousOverflow = document.body.style.overflow
        const focusableElements = () =>
            Array.from(
                dialog.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            )
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                setShowPaymentMethods(false)
                return
            }

            if (event.key !== 'Tab') return

            const focusable = focusableElements()
            const first = focusable[0]
            const last = focusable[focusable.length - 1]

            if (!first || !last) {
                event.preventDefault()
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.body.style.overflow = 'hidden'
        focusableElements()[0]?.focus()
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
            previousFocus?.focus()
        }
    }, [showPaymentMethods])
    const dateLabel = (value: string) =>
        formatStayDateTime(value, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })

    const proceedWithBooking = async (number: string) => {
        const normalized = normalizePhoneNumber(number)

        if (!normalized) {
            setSubmitError(
                'Enter a valid 10-digit PH mobile number starting with 9.',
            )
            return
        }

        const selectedRooms = roomGuests.filter(
            (room): room is RoomGuests & { stayId: string } =>
                room.stayId !== null,
        )

        if (selectedRooms.length === 0) {
            setSubmitError('Choose a room before continuing to payment.')
            return
        }

        if (!bookingKeyRef.current) {
            bookingKeyRef.current = window.crypto.randomUUID()
        }

        setIsSubmitting(true)
        setSubmitError('')

        try {
            const response = await createBooking(
                {
                    check_in: checkIn,
                    paid_days: stayWindow.paidDays,
                    check_out: checkOut,
                    rooms: selectedRooms.map((room) => ({
                        service_id: Number(room.stayId),
                        adults: room.adults,
                        kids: room.kids,
                    })),
                    contact_name: [firstName.trim(), lastName.trim()]
                        .filter(Boolean)
                        .join(' '),
                    contact_email: email.trim(),
                    contact_phone: normalized,
                    payment_method: paymentMethod,
                },
                bookingKeyRef.current,
            )

            navigate(`/payment/${response.data.data.reference}`)
        } catch (error) {
            setSubmitError(
                getApiErrorMessage(
                    error,
                    'Unable to create your booking. Please try again.',
                ),
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const continueToPayment = async () => {
        if (isSubmitting || !detailsFormRef.current?.reportValidity()) return

        const normalized = normalizePhoneNumber(contactPhone)

        if (!normalized) {
            setSubmitError(
                'Enter a valid 10-digit PH mobile number starting with 9.',
            )
            return
        }

        setSubmitError('')
        setPendingBookingNumber(normalized)
        setShowCancellationPolicy(true)
    }

    const handlePolicyContinue = async () => {
        const normalized = pendingBookingNumber
        setShowCancellationPolicy(false)
        setPendingBookingNumber('')
        if (!normalized) return

        // The first number an account uses is offered as a saved personal
        // number. Close keeps the booking as a guest number only; Continue
        // saves it before moving on to payment.
        if (user && savedNumbers.length === 0) {
            setSubmitError('')
            setSavePhoneError('')
            setSavePromptNumber(normalized)
            return
        }

        await proceedWithBooking(normalized)
    }

    const savePhoneAndContinue = async () => {
        if (!savePromptNumber) return

        setIsSavingPhone(true)
        setSavePhoneError('')

        try {
            const response = await addAccountPhoneNumber(savePromptNumber)
            setUser(response.data.user)
            setSavePromptNumber('')
            await proceedWithBooking(savePromptNumber)
        } catch (error) {
            setSavePhoneError(
                getApiErrorMessage(
                    error,
                    'Unable to save this phone number. Please try again.',
                ),
            )
        } finally {
            setIsSavingPhone(false)
        }
    }

    return (
        <main className="relative min-h-svh overflow-hidden bg-slate-100 px-4 pb-10 pt-8 font-poppins sm:px-7 sm:pt-10">
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${wholeVilla})` }}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-white/65" />
            <div className="relative mx-auto grid max-w-5xl items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] md:gap-6">
                <nav
                    aria-label="Booking steps"
                    className="col-span-full flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm lg:text-base"
                >
                    <button
                        type="button"
                        onClick={() =>
                            navigate('/services', {
                                state: {
                                    booking: {
                                        checkIn,
                                        checkOut,
                                        paidDays: stayWindow.paidDays,
                                        rooms: roomGuests,
                                    },
                                } satisfies ServicesRouteState,
                            })
                        }
                        className="inline-flex min-h-10 items-center rounded-lg bg-[#006dfc] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] sm:text-sm lg:text-base transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                        Back to services
                    </button>
                    <span aria-hidden="true" className="text-slate-400">/</span>
                    <span aria-current="step" className="font-semibold text-slate-800">
                        Your reservation
                    </span>
                    <span aria-hidden="true" className="text-slate-400">/</span>
                    <span className="text-slate-500">Payment</span>
                </nav>
                <section
                    aria-labelledby="reservation-title"
                    className="min-w-0 rounded-2xl bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.2)] sm:p-5"
                >
                    <h1
                        id="reservation-title"
                        className="mb-4 text-left font-jakarta text-lg font-semibold text-slate-800 sm:text-xl lg:text-2xl"
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
                                className="grid h-40 place-items-center rounded-lg bg-slate-100 text-xs text-slate-500 sm:h-48 sm:text-sm lg:text-base"
                            >
                                Photo unavailable
                            </div>
                        ))}
                    <p className="mt-3 border-b border-slate-100 pb-2 text-xs font-medium text-slate-500 sm:text-sm lg:text-base">
                        Selected accommodations
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-slate-100 py-3 text-xs text-slate-600 sm:grid-cols-4 sm:text-sm lg:text-base">
                        <div>
                            <span className="block">Check-in</span>
                            <strong className="font-jakarta text-xs font-semibold text-slate-800 sm:text-sm lg:text-base">{dateLabel(checkIn)}</strong>
                        </div>
                        <div>
                            <span className="block">Check-out</span>
                            <strong className="font-jakarta text-xs font-semibold text-slate-800 sm:text-sm lg:text-base">{dateLabel(checkOut)}</strong>
                        </div>
                        <div>
                            <span className="block">Paid days</span>
                            <strong className="font-jakarta text-xs font-semibold text-slate-800 sm:text-sm lg:text-base">
                                {formatPaidDays(stayWindow.paidDays)}
                            </strong>
                        </div>
                        <div>
                            <span className="block">Guest</span>
                            <strong className="font-jakarta text-xs font-semibold text-slate-800 sm:text-sm lg:text-base">
                                {roomGuests.reduce(
                                    (sum, room) => sum + room.adults + room.kids,
                                    0,
                                )}
                            </strong>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {assignedRooms.map(({ room, stay }, index) => {
                            const linePricing = getReservationPrice(
                                stay,
                                checkIn,
                                stayWindow.paidDays,
                                room.adults + room.kids,
                            )

                            return (
                                <div
                                    key={`${stay.id}-${index}`}
                                    className="flex min-w-0 items-start justify-between gap-3 py-3"
                                >
                                    <div className="min-w-0 text-[13px] leading-relaxed text-slate-600 sm:text-sm lg:text-base">
                                        <p className="break-words font-semibold text-[#006dfc]">
                                            {stay.title} #{index + 1}
                                        </p>
                                        <p>{room.adults} Adults{room.kids ? ` · ${room.kids} Kids` : ''}</p>
                                        {linePricing.extraHeads > 0 && (
                                            <p>
                                                Includes{' '}
                                                {money(
                                                    linePricing.additionalHeadTotal,
                                                )}{' '}
                                                additional head fee for{' '}
                                                {linePricing.extraHeads}{' '}
                                                {linePricing.extraHeads === 1
                                                    ? 'guest'
                                                    : 'guests'}
                                            </p>
                                        )}
                                        <p>Not refundable</p>
                                        <p>Payment Center / E-Wallet</p>
                                    </div>
                                    <strong className="shrink-0 font-jakarta text-sm font-semibold tabular-nums text-slate-700 sm:text-base lg:text-lg">
                                        {money(linePricing.total)}
                                    </strong>
                                </div>
                            )
                        })}
                    </div>

                    <section
                        aria-label="Selected payment method"
                        className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 shadow-[0_3px_12px_rgba(15,23,42,0.12)]"
                    >
                        <div className="flex items-center gap-2">
                            <img
                                src={selectedPaymentOption?.logo ?? ewalletLogo}
                                alt=""
                                className="size-8 object-contain"
                            />
                            <div>
                                <p                                 className="text-xs font-semibold text-slate-700 sm:text-sm lg:text-base">
                                    {paymentMethod}
                                </p>
                                {maskedPaymentNumber ? (
                                    <p className="text-xs text-slate-500 sm:text-sm lg:text-base">
                                        {maskedPaymentNumber}
                                    </p>
                                ) : (
                                    <p className="text-[13px] leading-relaxed text-slate-500 sm:text-sm lg:text-base">
                                        <Link
                                            to="/account/settings"
                                            className="font-semibold text-[#006dfc] hover:underline"
                                        >
                                            Link your mobile number
                                        </Link>
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            aria-haspopup="dialog"
                            aria-expanded={showPaymentMethods}
                            onClick={() => setShowPaymentMethods(true)}
                            className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-xs font-semibold text-[#006dfc] hover:bg-slate-50 sm:text-sm lg:text-base hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
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
                                ref={paymentMethodDialogRef}
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="payment-method-title"
                                className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-5"
                            >
                                <h2
                                    id="payment-method-title"
                                    className="mb-4 text-left font-jakarta text-lg font-semibold text-slate-800 sm:text-xl lg:text-2xl"
                                >
                                    Payment Method
                                </h2>
                                {!maskedPaymentNumber && (
                                    <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-[13px] leading-relaxed text-amber-900 sm:text-sm lg:text-base">
                                        No mobile number linked yet.{' '}
                                        <Link
                                            to="/account/settings"
                                            onClick={() => setShowPaymentMethods(false)}
                                            className="font-semibold underline underline-offset-2"
                                        >
                                            Link your mobile number
                                        </Link>{' '}
                                        to use e-wallet payments.
                                    </p>
                                )}
                                <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                                    <button
                                        type="button"
                                        aria-expanded={isEWalletOpen}
                                        onClick={() => setIsEWalletOpen((open) => !open)}
                                        className="flex min-h-11 w-full items-center justify-between bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 sm:text-sm lg:text-base"
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
                                            <ChevronUp aria-hidden="true" className="size-4" />
                                        ) : (
                                            <ChevronDown aria-hidden="true" className="size-4" />
                                        )}
                                    </button>
                                    {isEWalletOpen && (
                                        <div className="px-3">
                                            {paymentOptions.slice(0, 3).map((option) => (
                                                <label
                                                    key={option.name}
                                                    className="flex min-h-12 cursor-pointer items-center gap-2 border-t border-slate-100 py-3"
                                                >
                                                    <img
                                                        src={option.logo}
                                                        alt=""
                                                        className="h-5 w-7 shrink-0 object-contain"
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-xs font-semibold leading-tight text-slate-700 sm:text-sm lg:text-base">
                                                            {option.name}
                                                        </span>
                                                        <span className="block text-[13px] leading-relaxed text-slate-500 sm:text-sm lg:text-base">
                                                            {option.detail}
                                                        </span>
                                                    </span>
                                                    <input
                                                        type="radio"
                                                        name="reservation-payment-method"
                                                        value={option.name}
                                                        checked={paymentMethod === option.name}
                                                        onChange={() => setPaymentMethod(option.name)}
                                                        className="size-5 accent-[#006dfc]"
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
                                        className="flex min-h-11 w-full items-center justify-between bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 sm:text-sm lg:text-base"
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
                                            <ChevronUp aria-hidden="true" className="size-4" />
                                        ) : (
                                            <ChevronDown aria-hidden="true" className="size-4" />
                                        )}
                                    </button>
                                    {isBankOpen && (
                                        <div className="px-3">
                                            {paymentOptions.slice(3).map((option) => (
                                                <label
                                                    key={option.name}
                                                    className="flex min-h-12 cursor-pointer items-center gap-2 border-t border-slate-100 py-3"
                                                >
                                                    <img
                                                        src={option.logo}
                                                        alt=""
                                                        className="h-5 w-7 shrink-0 object-contain"
                                                    />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-xs font-semibold leading-tight text-slate-700 sm:text-sm lg:text-base">
                                                            {option.name}
                                                        </span>
                                                        <span className="block text-[13px] leading-relaxed text-slate-500 sm:text-sm lg:text-base">
                                                            {option.detail}
                                                        </span>
                                                    </span>
                                                    <input
                                                        type="radio"
                                                        name="reservation-payment-method"
                                                        value={option.name}
                                                        checked={paymentMethod === option.name}
                                                        onChange={() => setPaymentMethod(option.name)}
                                                        className="size-5 accent-[#006dfc]"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentMethods(false)}
                                    className="mt-4 min-h-12 w-full rounded-lg bg-[#006dfc] px-4 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] sm:text-sm lg:text-base transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                                >
                                    Confirm Payment Method
                                </button>
                            </section>
                        </div>
                    )}
                    <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-100 p-3 shadow-[0_3px_12px_rgba(15,23,42,0.12)]">
                        <span className="text-xs text-slate-600 sm:text-sm lg:text-base">Total payment</span>
                        <strong className="font-jakarta text-xl font-semibold tabular-nums text-[#006dfc] sm:text-2xl lg:text-3xl">{money(total)}</strong>
                    </div>
                </section>

                <section
                    aria-labelledby="details-title"
                    className="min-w-0 rounded-2xl bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.2)] sm:p-6"
                >
                    <h2
                        id="details-title"
                        className="mb-3 text-base font-semibold text-slate-800 sm:text-lg lg:text-xl"
                    >
                        Contact details
                    </h2>
                    <p className="mb-5 text-[13px] leading-relaxed text-slate-600 sm:text-sm lg:text-base">
                        {user
                            ? savedNumbers.length > 0
                                ? 'Your name and email are prefilled from your account. Choose a saved phone number, or use another one for this booking.'
                                : 'Your name and email are prefilled from your account. Add the phone number to use for this booking.'
                            : 'Enter the contact details for this booking.'}
                    </p>
                    <form
                        ref={detailsFormRef}
                        onSubmit={(event) => {
                            event.preventDefault()
                            void continueToPayment()
                        }}
                        className="space-y-5"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="block space-y-1">
                                <span className="block text-xs font-medium text-slate-700 sm:text-sm lg:text-base">First name <span aria-hidden="true">*</span></span>
                                <input
                                    required
                                    autoComplete="given-name"
                                    value={firstName}
                                    onChange={(event) => setFirstName(event.target.value)}
                                    readOnly={Boolean(user?.firstname)}
                                    className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base text-slate-800 outline-none focus:border-[#006dfc] focus:ring-1 focus:ring-[#006dfc] sm:text-sm lg:text-base read-only:bg-slate-50"
                                />
                            </label>
                            <label className="block space-y-1">
                                <span className="block text-xs font-medium text-slate-700 sm:text-sm lg:text-base">Last name <span aria-hidden="true">*</span></span>
                                <input
                                    required
                                    autoComplete="family-name"
                                    value={lastName}
                                    onChange={(event) => setLastName(event.target.value)}
                                    readOnly={Boolean(user?.lastname)}
                                    className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base text-slate-800 outline-none focus:border-[#006dfc] focus:ring-1 focus:ring-[#006dfc] sm:text-sm lg:text-base read-only:bg-slate-50"
                                />
                            </label>
                            <label className="block space-y-1 sm:col-span-2">
                                <span className="block text-xs font-medium text-slate-700 sm:text-sm lg:text-base">Email <span aria-hidden="true">*</span></span>
                                <input
                                    required
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    readOnly={Boolean(user?.email)}
                                    className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base text-slate-800 outline-none focus:border-[#006dfc] focus:ring-1 focus:ring-[#006dfc] sm:text-sm lg:text-base read-only:bg-slate-50"
                                />
                            </label>
                        </div>
                        <div className="space-y-1">
                            <span className="block text-xs font-medium text-slate-700 sm:text-sm lg:text-base">
                                Phone number <span aria-hidden="true">*</span>
                            </span>
                            {savedNumbers.length > 0 ? (
                                <>
                                    <select
                                        aria-label="Phone number"
                                        value={phoneChoice}
                                        onChange={(event) => {
                                            setPhoneChoice(event.target.value)
                                            setSubmitError('')
                                        }}
                                        className="min-h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base text-slate-800 outline-none focus:border-[#006dfc] focus:ring-1 focus:ring-[#006dfc] sm:text-sm lg:text-base"
                                    >
                                        {savedNumbers.map((phone) => (
                                            <option key={phone.id} value={String(phone.id)}>
                                                {formatPhoneNumber(phone.phone_number)}
                                                {phone.is_primary ? ' (Primary)' : ''}
                                                {phone.verified_at ? ' · Verified' : ''}
                                            </option>
                                        ))}
                                        <option value="new">Use another number</option>
                                    </select>
                                    {usingSavedNumber ? (
                                        <p className="text-[13px] leading-relaxed text-slate-500 sm:text-sm lg:text-base">
                                            Saved to your account. Choose “Use another number” to
                                            book with a different one.
                                        </p>
                                    ) : (
                                        <>
                                            <PhoneNumberInput
                                                value={customPhoneNumber}
                                                onChange={setCustomPhoneNumber}
                                                ariaLabel="New phone number"
                                                required
                                                className="min-h-12 rounded-md"
                                            />
                                            <p className="text-[13px] leading-relaxed text-slate-500 sm:text-sm lg:text-base">
                                                Booking-only number. The +63 prefix is added
                                                automatically and the number is stored in
                                                international format.
                                            </p>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    <PhoneNumberInput
                                        value={customPhoneNumber}
                                        onChange={setCustomPhoneNumber}
                                        ariaLabel="Phone number"
                                        required
                                        className="min-h-12 rounded-md"
                                    />
                                    <p className="text-[13px] leading-relaxed text-slate-500 sm:text-sm lg:text-base">
                                        Use your 10-digit PH mobile number (starting with
                                        9). The +63 prefix is added automatically.
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="text-[13px] leading-relaxed text-slate-600 sm:text-sm lg:text-base">
                            <label className="flex min-h-11 items-start gap-3 rounded-md py-2">
                                <input required type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[#006dfc]" />
                                <span>
                                    I have read the information regarding the handling of my
                                    personal data and I agree.{' '}
                                    <a href="/privacy" className="font-semibold text-[#006dfc] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]">
                                        Privacy Policy
                                    </a>
                                </span>
                            </label>
                        </div>
                        {submitError && (
                            <p
                                role="alert"
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-[13px] leading-relaxed text-rose-800"
                            >
                                {submitError}
                            </p>
                        )}
                        <button
                            type="submit"
                            onClick={continueToPayment}
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                            className="min-h-12 w-full rounded-lg bg-[#006dfc] px-4 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(8,117,249,0.3)] sm:text-sm lg:text-base transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
                        >
                            {isSubmitting ? 'Creating your booking…' : 'Continue to payment'}
                        </button>
                    </form>
                </section>
            </div>

            <CancellationPolicyModal
                open={showCancellationPolicy}
                onContinue={() => {
                    void handlePolicyContinue()
                }}
                onClose={() => {
                    setShowCancellationPolicy(false)
                    setPendingBookingNumber('')
                }}
            />

            {savePromptNumber && (
                <SavePhoneModal
                    phoneNumber={formatPhoneNumber(savePromptNumber)}
                    loading={isSavingPhone}
                    error={savePhoneError}
                    onClose={() => {
                        if (!isSavingPhone) {
                            setSavePromptNumber('')
                            setSavePhoneError('')
                        }
                    }}
                    onContinue={() => {
                        void savePhoneAndContinue()
                    }}
                />
            )}
        </main>
    )
}

