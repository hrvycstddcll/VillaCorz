import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from 'react'
import axios from 'axios'
import { Fan, Loader2, Trash2, X } from 'lucide-react'
import acIcon from '../../images/AC.png'
import crIcon from '../../images/Cr.png'
import tvIcon from '../../images/Tv.png'
import type {
    Service,
    ServiceDiscountType,
    ServiceKind,
    ServiceStatus,
} from '../../../services/types'
import {
    createService,
    updateService,
} from '../../../services/serviceService'
import { money } from '../../../lib/format'
import {
    getOfferPricing,
    type OfferPricing,
} from '../../../lib/pricing'
import OfferImageManager, {
    type ManagedOfferImage,
} from './OfferImageManager'

type OfferFormModalProps = {
    service: Service | null
    onClose: () => void
    onSaved: (message: string) => void
    onDelete: (service: Service) => void
}

type FieldErrors = Record<string, string>

type DiscountEntry = {
    type: ServiceDiscountType | 'none'
    value: string
}

const roundMoney = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100

const toDiscountEntry = (
    type: ServiceDiscountType | null | undefined,
    value: string | number | null | undefined,
    price: number,
): DiscountEntry => {
    // Older offers may store the discount as a percentage. Show it as the
    // equivalent peso value; the percent is derived again for display.
    if (type === 'percent' && value != null) {
        return {
            type: 'fixed',
            value: String(roundMoney((price * Number(value)) / 100)),
        }
    }

    return {
        type: type === 'fixed' ? 'fixed' : 'none',
        value:
            type === 'fixed' && value != null ? String(Number(value)) : '',
    }
}

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const inputClass = (hasError: boolean) =>
    `mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
        hasError
            ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
            : 'border-slate-200 focus:border-[#006dfc] focus:ring-[#006dfc]/10'
    }`

type RoomFeatureOption = {
    value: string
    icon: ReactNode
}

const roomFeatureOptions: RoomFeatureOption[] = [
    {
        value: 'TV',
        icon: <img src={tvIcon} alt="" className="size-4 object-contain" />,
    },
    {
        value: 'Private CR',
        icon: <img src={crIcon} alt="" className="size-4 object-contain" />,
    },
    {
        value: 'Airconditioned',
        icon: <img src={acIcon} alt="" className="size-4 object-contain" />,
    },
    {
        value: '2 Fans',
        icon: <Fan className="size-4" aria-hidden="true" />,
    },
]

const OfferFormModal = ({
    service,
    onClose,
    onSaved,
    onDelete,
}: OfferFormModalProps) => {
    const isEditing = service !== null
    const initialImages: ManagedOfferImage[] = (service?.images ?? []).map(
        (image) => ({
            key: `existing-${image.id}`,
            kind: 'existing',
            previewUrl: image.image_url,
            image,
        }),
    )

    const [name, setName] = useState(service?.name ?? '')
    const [kind, setKind] = useState<ServiceKind>(service?.kind ?? 'room')
    const [description, setDescription] = useState(service?.description ?? '')
    const [price, setPrice] = useState(
        service ? String(Number(service.price)) : '',
    )
    const [status, setStatus] = useState<ServiceStatus>(
        service?.status ?? 'active',
    )
    const [weekdayDiscount, setWeekdayDiscount] = useState<DiscountEntry>(() =>
        toDiscountEntry(
            service?.weekday_discount_type,
            service?.weekday_discount_value,
            Number(service?.price ?? 0),
        ),
    )
    const [pax, setPax] = useState(
        service?.pax != null ? String(service.pax) : '',
    )
    const [amenities, setAmenities] = useState<string[]>(
        service?.amenities ?? [],
    )
    const [images, setImages] = useState<ManagedOfferImage[]>(initialImages)
    const [primaryKey, setPrimaryKey] = useState<string | null>(
        initialImages.find((image) => image.image?.is_primary)?.key ??
            initialImages[0]?.key ??
            null,
    )
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [generalError, setGeneralError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const imagesRef = useRef(images)

    useEffect(() => {
        imagesRef.current = images
    }, [images])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !submitting) {
                onClose()
            }
        }

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [onClose, submitting])

    useEffect(() => {
        return () => {
            imagesRef.current.forEach((image) => {
                if (image.kind === 'new') {
                    URL.revokeObjectURL(image.previewUrl)
                }
            })
        }
    }, [])

    const clearFieldError = (field: string) => {
        setFieldErrors((current) => {
            if (!current[field]) return current

            const next = { ...current }
            delete next[field]
            return next
        })
    }

    const toggleAmenity = (value: string, checked: boolean) => {
        setAmenities((current) => {
            const selected = new Set(current)

            if (checked) {
                selected.add(value)
            } else {
                selected.delete(value)
            }

            return roomFeatureOptions
                .map((option) => option.value)
                .filter((option) => selected.has(option))
        })
        clearFieldError('amenities')
    }

    const priceNumber = Number(price)
    const safePrice = Number.isFinite(priceNumber) ? priceNumber : 0
    const weekendBase =
        service?.weekend_price != null
            ? Number(service.weekend_price)
            : safePrice
    const safeWeekendPrice = Number.isFinite(weekendBase)
        ? weekendBase
        : safePrice
    const weekdayPricing = getOfferPricing(
        safePrice,
        weekdayDiscount.type === 'none' ? null : weekdayDiscount.type,
        weekdayDiscount.value,
    )
    const dayPricing = {
        weekday: weekdayPricing,
        weekend: getOfferPricing(safeWeekendPrice, null, null),
        hasDiscount: weekdayPricing.hasDiscount,
    }

    const validate = () => {
        const errors: FieldErrors = {}

        if (!name.trim()) {
            errors.name = 'Offer name is required.'
        }

        if (price.trim() === '' || Number.isNaN(Number(price))) {
            errors.price = 'Enter a valid price.'
        } else if (Number(price) < 0) {
            errors.price = 'Price cannot be negative.'
        }

        const entry = weekdayDiscount
        const valueField = 'weekday_discount_value'
        const label = 'weekday'

        if (entry.type !== 'none') {
            const value = Number(entry.value)
            const field = valueField

            if (entry.value.trim() === '' || Number.isNaN(value)) {
                errors[field] = `Enter a ${label} discount value.`
            } else if (value <= 0) {
                errors[field] = 'Discount must be greater than zero.'
            } else if (entry.type === 'percent' && value > 100) {
                errors[field] = 'Percentage discount cannot exceed 100%.'
            } else if (
                entry.type === 'fixed' &&
                !Number.isNaN(priceNumber) &&
                value > priceNumber
            ) {
                errors[field] = 'Discount cannot exceed the offer price.'
            }
        }

        if (pax.trim() !== '') {
            const capacity = Number(pax)

            if (!Number.isInteger(capacity) || capacity < 1) {
                errors.pax = 'Enter a whole number of guests.'
            } else if (capacity > 1000) {
                errors.pax = 'Pax cannot be more than 1000.'
            }
        }

        if (images.length > 10) {
            errors.images = 'You can add up to 10 images.'
        }

        setFieldErrors(errors)

        return Object.keys(errors).length === 0
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setGeneralError('')

        if (!validate()) return

        const payload = new FormData()
        payload.append('name', name.trim())
        payload.append('kind', kind)
        payload.append('description', description.trim())
        payload.append('price', price)
        payload.append(
            'weekday_discount_type',
            weekdayDiscount.type === 'none' ? '' : weekdayDiscount.type,
        )
        payload.append(
            'weekday_discount_value',
            weekdayDiscount.type === 'none' ? '' : weekdayDiscount.value,
        )
        payload.append('weekend_discount_type', '')
        payload.append('weekend_discount_value', '')
        payload.append('pax', pax.trim())
        payload.append('amenities_present', '1')
        amenities.forEach((amenity) => payload.append('amenities[]', amenity))
        payload.append('status', status)
        payload.append('image_order_present', '1')

        const newImages = images.filter(
            (image): image is ManagedOfferImage & { file: File } =>
                image.kind === 'new' && Boolean(image.file),
        )

        newImages.forEach((image) => {
            payload.append('images[]', image.file)
        })

        const newTokens = new Map(
            newImages.map((image, index) => [image.key, `new:${index}`]),
        )

        const tokenFor = (image: ManagedOfferImage) =>
            image.kind === 'existing'
                ? `existing:${image.image?.id}`
                : newTokens.get(image.key) ?? ''

        images.forEach((image) => {
            const token = tokenFor(image)

            if (token) {
                payload.append('image_order[]', token)
            }
        })

        const primaryImage =
            images.find((image) => image.key === primaryKey) ?? images[0] ?? null

        if (primaryImage) {
            const token = tokenFor(primaryImage)

            if (token) {
                payload.append('primary_image', token)
            }
        }

        setSubmitting(true)

        try {
            const response = isEditing
                ? await updateService(service.id, payload)
                : await createService(payload)

            onSaved(
                response.data.message ??
                    (isEditing
                        ? 'Offer updated successfully.'
                        : 'Offer created successfully.'),
            )
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const data = error.response?.data as
                    | {
                          message?: string
                          errors?: Record<string, string[]>
                      }
                    | undefined

                if (data?.errors) {
                    const nextErrors: FieldErrors = {}
                    let imageError = ''

                    Object.entries(data.errors).forEach(([field, messages]) => {
                        const message = messages[0]

                        if (!message) return

                        const rootField = field.split('.')[0]

                        if (
                            rootField.startsWith('image') ||
                            rootField === 'primary_image'
                        ) {
                            imageError = message
                        } else if (
                            [
                                'name',
                                'kind',
                                'description',
                                'price',
                                'weekday_discount_type',
                                'weekday_discount_value',
                                'weekend_discount_type',
                                'weekend_discount_value',
                                'status',
                                'pax',
                                'amenities',
                            ].includes(rootField)
                        ) {
                            nextErrors[rootField] = message
                        }
                    })

                    if (imageError) {
                        nextErrors.images = imageError
                    }

                    setFieldErrors(nextErrors)

                    if (Object.keys(nextErrors).length === 0) {
                        setGeneralError(
                            data.message ??
                                'Please check the form and try again.',
                        )
                    }

                    return
                }

                if (error.response?.status === 401) {
                    setGeneralError(
                        'Your session has expired. Please sign in again.',
                    )
                } else if (error.response?.status === 403) {
                    setGeneralError(
                        'You do not have permission to manage offers.',
                    )
                } else {
                    setGeneralError(
                        data?.message ??
                            'Unable to save the offer. Please try again.',
                    )
                }

                return
            }

            setGeneralError('Unable to save the offer. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const renderDayDiscount = ({
        group,
        title,
        hint,
        entry,
        setEntry,
        pricing,
    }: {
        group: 'weekday' | 'weekend'
        title: string
        hint: string
        entry: DiscountEntry
        setEntry: (next: DiscountEntry) => void
        pricing: OfferPricing
    }) => {
        const typeField = `${group}_discount_type`
        const valueField = `${group}_discount_value`
        const typeError = fieldErrors[typeField]
        const valueError = fieldErrors[valueField]

        const changeType = (type: ServiceDiscountType | 'none') => {
            setEntry({ type, value: '' })
            setFieldErrors((current) => {
                if (!current[typeField] && !current[valueField]) {
                    return current
                }

                const next = { ...current }
                delete next[typeField]
                delete next[valueField]
                return next
            })
        }

        return (
            <div
                key={group}
                className="rounded-xl border border-slate-200 bg-white p-3.5"
            >
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-[#003079]">
                        {title}
                    </p>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        {hint}
                    </span>
                </div>

                <div className="mt-2">
                    <label
                        htmlFor={`offer-${group}-discount-type`}
                        className="text-xs font-semibold text-slate-600"
                    >
                        Discount type
                    </label>
                    <select
                        id={`offer-${group}-discount-type`}
                        value={entry.type}
                        disabled={submitting}
                        onChange={(event) =>
                            changeType(
                                event.target.value as
                                    | ServiceDiscountType
                                    | 'none',
                            )
                        }
                        className={inputClass(Boolean(typeError))}
                    >
                        <option value="none">No discount</option>
                        <option value="fixed">Discount value (₱)</option>
                    </select>
                    {typeError && (
                        <p className="mt-1.5 text-xs text-rose-600">
                            {typeError}
                        </p>
                    )}
                </div>

                {entry.type !== 'none' && (
                    <div className="mt-3">
                        <label
                            htmlFor={`offer-${group}-discount-value`}
                            className="text-xs font-semibold text-slate-600"
                        >
                            Discount value{' '}
                            <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            {entry.type === 'fixed' && (
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400"
                                >
                                    ₱
                                </span>
                            )}
                            <input
                                id={`offer-${group}-discount-value`}
                                type="number"
                                min="0"
                                max={
                                    entry.type === 'percent'
                                        ? 100
                                        : safePrice > 0
                                          ? safePrice
                                          : undefined
                                }
                                step="0.01"
                                inputMode="decimal"
                                disabled={submitting}
                                value={entry.value}
                                onChange={(event) => {
                                    setEntry({
                                        ...entry,
                                        value: event.target.value,
                                    })
                                    clearFieldError(valueField)
                                }}
                                placeholder={
                                    entry.type === 'percent'
                                        ? 'e.g. 20'
                                        : 'e.g. 500'
                                }
                                aria-invalid={Boolean(valueError)}
                                className={`${inputClass(Boolean(valueError))} ${
                                    entry.type === 'fixed' ? 'pl-8' : 'pr-8'
                                }`}
                            />
                            {entry.type === 'percent' && (
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400"
                                >
                                    %
                                </span>
                            )}
                        </div>
                        {valueError && (
                            <p className="mt-1.5 text-xs text-rose-600">
                                {valueError}
                            </p>
                        )}
                    </div>
                )}

                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    {pricing.hasDiscount ? (
                        <>
                            Sale price{' '}
                            <span className="font-semibold text-[#003079]">
                                {money(pricing.price)}
                            </span>{' '}
                            · save{' '}
                            <span className="font-semibold text-emerald-600">
                                {money(pricing.discountAmount)}
                            </span>{' '}
                            · {pricing.discountPercent}% off
                        </>
                    ) : (
                        <>
                            Regular price{' '}
                            <span className="font-semibold text-[#003079]">
                                {money(safePrice)}
                            </span>
                        </>
                    )}
                </p>
            </div>
        )
    }

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) {
                    onClose()
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="offer-form-title"
                className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
            >
                <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
                    <div>
                        <h2
                            id="offer-form-title"
                            className="font-serif text-2xl font-bold text-[#003079]"
                        >
                            {isEditing ? 'Edit Offer' : 'Add Offer'}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        aria-label="Close offer form"
                        className={`inline-grid size-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 ${focusRing}`}
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="space-y-5 px-5 py-5 sm:px-6">
                        {generalError && (
                            <p
                                role="alert"
                                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm leading-6 text-rose-700"
                            >
                                {generalError}
                            </p>
                        )}

                        <div>
                            <label
                                htmlFor="offer-name"
                                className="text-xs font-semibold text-slate-600"
                            >
                                Offer name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="offer-name"
                                type="text"
                                value={name}
                                onChange={(event) => {
                                    setName(event.target.value)
                                    clearFieldError('name')
                                }}
                                maxLength={255}
                                placeholder="e.g. Whole Villa Stay"
                                aria-invalid={Boolean(fieldErrors.name)}
                                className={inputClass(Boolean(fieldErrors.name))}
                            />
                            {fieldErrors.name && (
                                <p className="mt-1.5 text-xs text-rose-600">
                                    {fieldErrors.name}
                                </p>
                            )}
                        </div>

                        <div
                            className={`grid gap-5 ${
                                isEditing
                                    ? 'sm:grid-cols-3'
                                    : 'sm:grid-cols-2'
                            }`}
                        >
                        {!isEditing && (
                            <div>
                                <label
                                    htmlFor="offer-kind"
                                    className="text-xs font-semibold text-slate-600"
                                >
                                    Accommodation type{' '}
                                    <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    id="offer-kind"
                                    value={kind}
                                    disabled={submitting}
                                    onChange={(event) =>
                                        setKind(event.target.value as ServiceKind)
                                    }
                                    className={inputClass(Boolean(fieldErrors.kind))}
                                >
                                    <option value="room">Room</option>
                                    <option value="exclusive">
                                        Whole villa
                                    </option>
                                </select>
                                {fieldErrors.kind && (
                                    <p className="mt-1.5 text-xs text-rose-600">
                                        {fieldErrors.kind}
                                    </p>
                                )}
                                <p className="mt-1.5 text-xs text-slate-500">
                                    Only one whole-villa offer can exist.
                                </p>
                            </div>
                        )}

                                {fieldErrors.price && (
                                    <p className="mt-1.5 text-xs text-rose-600">
                                        {fieldErrors.price}
                                    </p>
                                )}
                            </div>


                            <div>
                                <label
                                    htmlFor="offer-price"
                                    className="text-xs font-semibold text-slate-600"
                                >
                                    Price <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400"
                                    >
                                        &#8369;
                                    </span>
                                    <input
                                        id="offer-price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        inputMode="decimal"
                                        value={price}
                                        onChange={(event) => {
                                            setPrice(event.target.value)
                                            clearFieldError('price')
                                        }}
                                        placeholder="0.00"
                                        aria-invalid={Boolean(fieldErrors.price)}
                                        className={`${inputClass(Boolean(fieldErrors.price))} pl-8`}
                                    />
                                </div>
                                {fieldErrors.price && (
                                    <p className="mt-1.5 text-xs text-rose-600">
                                        {fieldErrors.price}
                                    </p>
                                )}
                            </div>

                            {!isEditing ? null : (
                                <div>
                                    <label
                                        htmlFor="offer-status"
                                        className="text-xs font-semibold text-slate-600"
                                    >
                                        Status <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        id="offer-status"
                                        value={status}
                                        onChange={(event) =>
                                            setStatus(
                                                event.target.value as ServiceStatus,
                                            )
                                        }
                                        className={inputClass(Boolean(fieldErrors.status))}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                    {fieldErrors.status && (
                                        <p className="mt-1.5 text-xs text-rose-600">
                                            {fieldErrors.status}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="offer-pax"
                                    className="text-xs font-semibold text-slate-600"
                                >
                                    Pax
                                </label>
                                <input
                                    id="offer-pax"
                                    type="number"
                                    min="1"
                                    max="1000"
                                    step="1"
                                    inputMode="numeric"
                                    value={pax}
                                    onChange={(event) => {
                                        setPax(event.target.value)
                                        clearFieldError('pax')
                                    }}
                                    placeholder="e.g. 4"
                                    aria-invalid={Boolean(fieldErrors.pax)}
                                    className={inputClass(Boolean(fieldErrors.pax))}
                                />
                                {fieldErrors.pax && (
                                    <p className="mt-1.5 text-xs text-rose-600">
                                        {fieldErrors.pax}
                                    </p>
                                )}
                            </div>
                        </div>


                        <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                        <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                            <legend className="px-1 text-xs font-semibold text-slate-600">
                                Sale / discount
                            </legend>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                One discount for weekday stays (Mon-Thu). Weekends use the regular price.
                            </p>
                            <div className="mt-3">
                                {renderDayDiscount({
                                    group: 'weekday',
                                    title: 'Discount',
                                    hint: 'Mon-Thu',
                                    entry: weekdayDiscount,
                                    setEntry: setWeekdayDiscount,
                                    pricing: dayPricing.weekday,
                                })}
                            </div>
                        </fieldset>

                            <legend className="text-xs font-semibold text-slate-600">
                                Room Features
                            </legend>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                {roomFeatureOptions.map((option) => {
                                    const checked = amenities.includes(
                                        option.value,
                                    )

                                    return (
                                        <label
                                            key={option.value}
                                            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition focus-within:border-[#006dfc] focus-within:ring-4 focus-within:ring-[#006dfc]/10 ${
                                                checked
                                                    ? 'border-[#006dfc] bg-[#006dfc]/5 text-[#003079]'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                            } ${
                                                submitting
                                                    ? 'pointer-events-none opacity-60'
                                                    : ''
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={submitting}
                                                onChange={(event) =>
                                                    toggleAmenity(
                                                        option.value,
                                                        event.target.checked,
                                                    )
                                                }
                                                className="size-4 shrink-0 accent-[#006dfc]"
                                            />
                                            <span
                                                className="text-emerald-500"
                                                aria-hidden="true"
                                            >
                                                {option.icon}
                                            </span>
                                            <span className="font-medium">
                                                {option.value}
                                            </span>
                                        </label>
                                    )
                                })}
                            </div>
                            {fieldErrors.amenities && (
                                <p className="mt-1.5 text-xs text-rose-600">
                                    {fieldErrors.amenities}
                                </p>
                            )}
                        </fieldset>

                        <div>
                            <label
                                htmlFor="offer-description"
                                className="text-xs font-semibold text-slate-600"
                            >
                                Description
                            </label>
                            <textarea
                                id="offer-description"
                                value={description}
                                onChange={(event) => {
                                    setDescription(event.target.value)
                                    clearFieldError('description')
                                }}
                                rows={3}
                                placeholder="Describe what this offer includes."
                                className={`${inputClass(Boolean(fieldErrors.description))} resize-y`}
                            />
                            {fieldErrors.description && (
                                <p className="mt-1.5 text-xs text-rose-600">
                                    {fieldErrors.description}
                                </p>
                            )}
                        </div>

                        <div className="border-t border-slate-100 pt-5">
                            <OfferImageManager
                                images={images}
                                primaryKey={primaryKey}
                                onChange={setImages}
                                onPrimaryChange={setPrimaryKey}
                                disabled={submitting}
                                error={fieldErrors.images}
                            />
                    </div>

                    <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        {isEditing && (
                            <button
                                type="button"
                                onClick={() => onDelete(service)}
                                disabled={submitting}
                                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-200 bg-white px-4 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                            >
                                <Trash2 className="mr-2 size-4" aria-hidden="true" />
                                Delete
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#006dfc] px-5 text-xs font-semibold text-white transition hover:bg-[#0058cc] disabled:opacity-60"
                        >
                            {submitting && (
                                <Loader2
                                    className="mr-2 size-4 animate-spin"
                                    aria-hidden="true"
                                />
                            )}
                            {submitting
                                ? 'Saving...'
                                : isEditing
                                  ? 'Save changes'
                                  : 'Create offer'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    )
}

export default OfferFormModal
