import { money } from '../../../../lib/format'
import { Check, ImageOff, X } from 'lucide-react'
import star from '../../../images/star.png'

export type ServiceTileStay = {
    id: string
    title: string
    image: string
    price: number
    weekendPrice?: number
    originalPrice?: number
    weekendOriginalPrice?: number
    discountLabel?: string
    capacity: string
    rating?: string
    ratingAverage?: number | null
    reviewsCount?: number
    badge?: string
}

type RoomTileProps = {
    variant: 'room'
    stay: ServiceTileStay
    isSelected: boolean
    isReservationSelected: boolean
    selectedRoomNumber?: number
    unavailable?: boolean
    onSelect: () => void
    onToggleReservation: () => void
}

type ExclusiveTileProps = {
    variant: 'exclusive'
    stay: ServiceTileStay
    isSelected: boolean
    activePhoto: string
    gallery: string[]
    unavailable?: boolean
    onSelect: () => void
    onSelectPhoto: (image: string) => void
}

type ServiceTileProps = RoomTileProps | ExclusiveTileProps

const DiscountRibbon = ({ label }: { label: string }) => {
    const percent = label.match(/(\d+(?:\.\d+)?)\s*%/)?.[1]
    const isUpTo = label.toLowerCase().startsWith('up to')

    return (
        <span className="pointer-events-none absolute right-0 top-0 z-10 flex h-[5.5rem] w-[5.5rem] flex-col items-end bg-[#006dfc] pr-2 pt-2 text-white [clip-path:polygon(100%_0,0_0,100%_100%)] sm:h-24 sm:w-24 sm:pr-2.5 sm:pt-2.5">
            {percent ? (
                <>
                    {isUpTo && (
                        <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.1em] text-white/90 sm:text-[11px]">
                            Up to
                        </span>
                    )}
                    <span className="text-lg font-bold leading-none sm:text-xl">
                        {percent}%
                    </span>
                    <span className="pt-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-white sm:text-[11px]">
                        Off
                    </span>
                </>
            ) : (
                <span className="max-w-16 text-right text-[10px] font-bold uppercase leading-tight sm:max-w-20 sm:text-[11px]">
                    {label}
                </span>
            )}
        </span>
    )
}

const RatingBadge = ({ rating }: { rating: string }) => (
    <span
        role="img"
        aria-label={`Rated ${rating} out of 5`}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/45 px-2 py-1 font-semibold leading-none text-white backdrop-blur-sm"
    >
        <img
            src={star}
            alt=""
            aria-hidden="true"
            className="size-3.5 shrink-0 object-contain"
        />
        <span aria-hidden="true" className="text-[11px] sm:text-xs">
            {rating}
        </span>
    </span>
)

const ServiceTile = (props: ServiceTileProps) => {
    if (props.variant === 'exclusive') {
        const { stay, isSelected, activePhoto, gallery, unavailable = false, onSelect, onSelectPhoto } = props
        const hasWeekdayOriginal =
            stay.originalPrice != null && stay.originalPrice > stay.price
        const weekendPrice = stay.weekendPrice ?? stay.price
        const hasWeekendOriginal =
            stay.weekendOriginalPrice != null &&
            stay.weekendOriginalPrice > weekendPrice

        return (
            <>
                <div className={`group relative overflow-hidden rounded-xl shadow-md ring-1 ring-black/5 ${unavailable ? 'opacity-60 saturate-50' : ''}`}>
                    <button
                        type="button"
                        onClick={onSelect}
                        aria-pressed={isSelected}
                        aria-label="View whole villa photos and details"
                        className="block w-full text-left"
                    >
                        {stay.image ? (
                            <img
                                src={isSelected ? activePhoto : stay.image}
                                alt="Blue-roofed Villa Corz beach house"
                                loading="lazy"
                                decoding="async"
                                className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.01] sm:h-64 lg:h-72"
                            />
                        ) : (
                            <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-slate-400 sm:h-64 lg:h-72">
                                <div className="flex flex-col items-center gap-2">
                                    <ImageOff className="size-8" aria-hidden="true" />
                                    <span className="text-xs font-medium">
                                        No image
                                    </span>
                                </div>
                            </div>
                        )}
                        <span className="absolute inset-x-0 bottom-0 flex h-[42%] items-end justify-between gap-2 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent px-2 pb-1 pt-1 text-white shadow-[0_-8px_20px_rgba(0,0,0,0.2)] backdrop-blur-[1px] sm:px-2.5">
                            <span
                                className={`absolute left-0 top-0 inline-flex w-[34%] min-w-55 max-w-90 items-center justify-between gap-2 bg-white px-3 py-1.5 text-[#006dfc] shadow-sm sm:px-3.5 ${
                                    hasWeekdayOriginal ? 'h-auto' : 'min-h-11'
                                }`}
                            >
                                <span className="shrink-0 text-left text-xs font-semibold italic leading-[1.05] sm:text-sm">
                                    Weekdays
                                    <span className="block text-[10px] font-medium sm:text-[11px]">Mon - Thu</span>
                                </span>
                                <span className="min-w-0 text-right">
                                    <span className="block whitespace-nowrap text-xl font-bold leading-none sm:text-2xl">
                                        {money(stay.price)}
                                    </span>
                                    {hasWeekdayOriginal && (
                                        <span className="block whitespace-nowrap text-[10px] font-medium leading-none text-slate-500 line-through sm:text-[11px]">
                                            {money(stay.originalPrice!)}
                                        </span>
                                    )}
                                </span>
                            </span>
                            <span className="absolute right-2 -top-9 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[#006dfc] shadow-sm sm:right-3 sm:text-[11px]">
                                {stay.badge}
                            </span>
                            <span className="flex min-w-0 flex-col items-start gap-0.5 pt-9 sm:pt-11">
                                <span className="block text-sm font-bold leading-tight sm:text-base">
                                    Whole Villa
                                </span>
                                <span className="flex items-center gap-1 truncate text-[11px] leading-tight text-white/90 sm:text-xs">
                                    <span>{stay.capacity}</span>
                                    {stay.rating && (
                                        <RatingBadge rating={stay.rating} />
                                    )}
                                </span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-1">
                                <span className="rounded-md bg-white/20 px-2 py-1 text-center text-white shadow-sm ring-1 ring-white/25 backdrop-blur-sm sm:px-3">
                                    <span className="block text-[10px] font-medium leading-tight sm:text-[11px]">
                                        Weekends
                                    </span>
                                    <span className="block text-sm font-bold leading-tight sm:text-base">
                                        {money(stay.weekendPrice ?? stay.price)}
                                    </span>
                                    {hasWeekendOriginal && (
                                        <span className="block whitespace-nowrap text-[10px] font-medium leading-tight text-white/80 line-through sm:text-[11px]">
                                            {money(stay.weekendOriginalPrice!)}
                                        </span>
                                    )}
                                </span>
                                <span className="rounded-md bg-white px-3 py-1.5 text-[11px] font-semibold text-[#006dfc] shadow-sm sm:text-xs">
                                    View details
                                </span>
                            </span>
                        </span>
                    </button>
                    {unavailable ? (
                        <span className="pointer-events-none absolute left-2 top-2 z-20 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm sm:text-[11px]">
                            Unavailable
                        </span>
                    ) : null}
                    {stay.discountLabel ? <DiscountRibbon label={stay.discountLabel} /> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 pb-2">
                    {gallery.map((image, index) => (
                        <button
                            key={image}
                            type="button"
                            onClick={() => onSelectPhoto(image)}
                            aria-label={`Show whole villa photo ${index + 1}`}
                            aria-pressed={isSelected && activePhoto === image}
                            className={`shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                                isSelected && activePhoto === image
                                    ? 'ring-[#006dfc]'
                                    : 'ring-transparent'
                            }`}
                        >
                            <img src={image} alt="" loading="lazy" decoding="async" className="h-14 w-20 object-cover sm:h-16 sm:w-24" />
                        </button>
                    ))}
                </div>
            </>
        )
    }

    const {
        stay,
        isSelected,
        isReservationSelected,
        selectedRoomNumber,
        unavailable = false,
        onSelect,
        onToggleReservation,
    } = props

    return (
        <article
            className={`group relative min-w-0 overflow-hidden rounded-xl bg-white text-left shadow-md ring-1 ${
                isSelected || isReservationSelected
                    ? 'ring-2 ring-[#006dfc]'
                    : 'ring-black/5'
            } ${unavailable ? 'opacity-60 saturate-50' : ''}`}
        >
            <div className="relative aspect-[5/4] w-full overflow-hidden bg-slate-100">
                <button
                    type="button"
                    onClick={onSelect}
                    aria-label={`View ${stay.title} photo and details`}
                    className="absolute inset-0 block w-full focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#006dfc]"
                >
                    {stay.image ? (
                        <img
                            src={stay.image}
                            alt={`${stay.title} interior`}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full scale-[1.02] object-cover transition duration-500 group-hover:scale-[1.06] motion-reduce:transition-none"
                        />
                    ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-slate-400">
                            <span className="flex flex-col items-center gap-2">
                                <ImageOff className="size-8" aria-hidden="true" />
                                <span className="text-xs font-medium">
                                    No image
                                </span>
                            </span>
                        </span>
                    )}
                </button>

                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 top-[35%] bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-transparent shadow-[0_-8px_20px_rgba(0,0,0,0.2)] backdrop-blur-[1px]"
                />

                {stay.discountLabel ? <DiscountRibbon label={stay.discountLabel} /> : null}
                {stay.badge ? (
                    <span className="pointer-events-none absolute right-2 top-[5.75rem] z-20 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold leading-tight text-[#006dfc] shadow-sm sm:right-2.5 sm:top-[6.25rem] sm:text-[11px]">
                        {stay.badge}
                    </span>
                ) : null}
                {isReservationSelected ? (
                    <span className="pointer-events-none absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-full bg-[#006dfc] px-2 py-1 text-[10px] font-semibold text-white shadow-sm sm:text-[11px]">
                        <Check className="size-3 shrink-0" aria-hidden="true" />
                        Added{selectedRoomNumber ? ` · Room ${selectedRoomNumber}` : ''}
                    </span>
                ) : null}
                {unavailable ? (
                    <span className={`pointer-events-none absolute left-2 z-20 rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-semibold text-white shadow-sm sm:text-[11px] ${isReservationSelected ? 'top-9' : 'top-2'}`}>
                        Unavailable
                    </span>
                ) : null}

                <span className="pointer-events-none absolute inset-x-0 bottom-0 grid gap-2 p-3 text-white sm:p-3.5">
                    <span className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-3">
                        <span className="min-w-0">
                            <span className="inline-flex min-h-11 max-w-full items-center gap-2 bg-white px-2 py-1.5 text-[#006dfc] shadow-sm sm:px-2.5">
                                <span className="shrink-0 text-left text-[11px] font-semibold italic leading-[1.05] sm:text-xs">
                                    Weekdays
                                    <span className="block text-[10px] font-medium">Mon - Thu</span>
                                </span>
                                <span className="min-w-0 text-right tabular-nums">
                                    <span className="block whitespace-nowrap text-base font-bold leading-none sm:text-lg">
                                        {money(stay.price)}
                                    </span>
                                    {stay.originalPrice != null &&
                                        stay.originalPrice > stay.price && (
                                            <span className="block whitespace-nowrap text-[10px] font-medium leading-none text-slate-500 line-through sm:text-[11px]">
                                                {money(stay.originalPrice)}
                                            </span>
                                        )}
                                </span>
                            </span>

                            <span className="mt-2 block min-w-0">
                                <span
                                    className="line-clamp-2 text-sm font-bold leading-tight sm:text-base"
                                    title={stay.title}
                                >
                                    {stay.title}
                                </span>
                                <span className="mt-1 flex min-w-0 items-center gap-1 text-[11px] leading-tight text-white/90 sm:text-xs">
                                    <span className="truncate">{stay.capacity}</span>
                                    {stay.rating && (
                                        <RatingBadge rating={stay.rating} />
                                    )}
                                </span>
                            </span>
                        </span>

                        <span className="flex min-w-0 shrink-0 flex-row items-end gap-2 sm:flex-col sm:items-end">
                            <span className="rounded-md bg-white/20 px-2 py-1 text-center shadow-sm ring-1 ring-white/25 backdrop-blur-sm sm:px-3">
                                <span className="block text-[10px] font-medium leading-tight sm:text-[11px]">
                                    Weekends
                                </span>
                                <span className="block whitespace-nowrap text-sm font-bold leading-tight tabular-nums sm:text-base">
                                    {money(stay.weekendPrice ?? stay.price)}
                                </span>
                                {stay.weekendOriginalPrice != null &&
                                    stay.weekendOriginalPrice >
                                        (stay.weekendPrice ?? stay.price) && (
                                        <span className="block whitespace-nowrap text-[10px] font-medium leading-tight text-white/80 line-through sm:text-[11px]">
                                            {money(stay.weekendOriginalPrice)}
                                        </span>
                                    )}
                            </span>
                            <button
                                type="button"
                                onClick={onToggleReservation}
                                disabled={unavailable && !isReservationSelected}
                                aria-label={
                                    isReservationSelected
                                        ? `Remove ${stay.title} from your booking`
                                        : unavailable
                                          ? `${stay.title} is unavailable for these dates`
                                          : `Add ${stay.title} to your booking, good for ${stay.capacity}`
                                }
                                aria-pressed={isReservationSelected}
                                className={`pointer-events-auto inline-flex min-h-11 items-center justify-center gap-1 rounded-md px-3 py-2 text-xs font-semibold shadow-sm transition-colors duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70 sm:px-3.5 ${
                                    isReservationSelected
                                        ? 'bg-[#006dfc] text-white hover:bg-blue-700'
                                        : 'bg-white text-[#006dfc] hover:bg-[#006dfc] hover:text-white'
                                }`}
                            >
                                {isReservationSelected ? (
                                    <>
                                        <X className="size-3.5" aria-hidden="true" />
                                        Remove
                                    </>
                                ) : unavailable ? (
                                    'Unavailable'
                                ) : (
                                    'Add room'
                                )}
                            </button>
                        </span>
                    </span>
                </span>
            </div>
        </article>
    )
}

export default ServiceTile
