import { guestCapacity, money } from '../../../lib/format'
import discountBadge from '../../images/discount-20.png'
import bestSellerBadge from '../../images/bestselling.png'
import star from '../../images/star.png'

export type ServiceTileStay = {
    id: string
    title: string
    image: string
    price: number
    weekendPrice?: number
    capacity: string
    rating?: string
    badge?: string
}

type RoomTileProps = {
    variant: 'room'
    stay: ServiceTileStay
    isSelected: boolean
    isReservationSelected: boolean
    onSelect: () => void
    onToggleReservation: () => void
}

type ExclusiveTileProps = {
    variant: 'exclusive'
    stay: ServiceTileStay
    isSelected: boolean
    activePhoto: string
    gallery: string[]
    onSelect: () => void
    onSelectPhoto: (image: string) => void
}

type ServiceTileProps = RoomTileProps | ExclusiveTileProps

const ServiceTile = (props: ServiceTileProps) => {
    if (props.variant === 'exclusive') {
        const { stay, isSelected, activePhoto, gallery, onSelect, onSelectPhoto } = props

        return (
            <>
                <div className="group relative overflow-hidden rounded-xl shadow-md ring-1 ring-black/5">
                    <button
                        type="button"
                        onClick={onSelect}
                        aria-pressed={isSelected}
                        aria-label="Select the whole villa"
                        className="block w-full text-left"
                    >
                        <img
                            src={isSelected ? activePhoto : stay.image}
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
                                        {money(stay.price)}
                                    </span>
                                </span>
                            </span>
                            <span className="absolute right-2 -top-9 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-semibold text-[#006dfc] shadow-sm sm:right-3 sm:text-[10px]">
                                {stay.badge}
                            </span>
                            <span className="flex min-w-0 flex-col items-start gap-0.5 pt-7">
                                <span className="block text-xs font-bold leading-tight sm:text-sm">
                                    Whole Villa
                                </span>
                                <span className="flex items-center gap-1 truncate text-[8px] leading-tight text-white/95 sm:text-[9px]">
                                    <span>{stay.capacity}</span>
                                    <img src={star} alt="" className="size-3 shrink-0 object-contain" />
                                    <span>{stay.rating}</span>
                                </span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-1">
                                <span className="rounded-md bg-white/35 px-2 py-0.5 text-center text-white shadow-sm backdrop-blur-sm sm:px-3">
                                    <span className="block text-[7px] font-medium leading-tight sm:text-[8px]">
                                        Weekends
                                    </span>
                                    <span className="block text-xs font-bold leading-tight sm:text-sm">
                                        {money(stay.weekendPrice ?? stay.price)}
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
                            <img src={image} alt="" className="h-14 w-20 object-cover sm:h-16 sm:w-24" />
                        </button>
                    ))}
                </div>
            </>
        )
    }

    const { stay, isSelected, isReservationSelected, onSelect, onToggleReservation } = props

    return (
        <article
            className={`group relative min-w-[72vw] snap-start overflow-hidden rounded-xl bg-white text-left shadow-md ring-1 sm:min-w-0 ${
                isSelected || isReservationSelected
                    ? 'ring-2 ring-[#006dfc]'
                    : 'ring-black/5'
            }`}
        >
            <button
                type="button"
                onClick={onSelect}
                aria-label={`View ${stay.title} photo and details`}
                className="block w-full focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#006dfc]"
            >
                <img
                    src={stay.image}
                    alt={`${stay.title} interior`}
                    className="h-56 w-full scale-[1.05] object-cover transition duration-500 group-hover:scale-[1.08] sm:h-64 lg:h-72"
                />
            </button>
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
                    <button
                        type="button"
                        onClick={onToggleReservation}
                        aria-label={`Select ${stay.title}, good for ${guestCapacity(stay)} guests`}
                        aria-pressed={isReservationSelected}
                        className="rounded-md bg-white px-2.5 py-1.5 text-[9px] font-semibold text-[#006dfc] shadow-sm transition duration-200 hover:scale-105 hover:bg-[#006dfc] hover:text-white hover:shadow-md active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-3 sm:text-[10px]"
                    >
                        Select room
                    </button>
                </span>
            </span>
        </article>
    )
}

export default ServiceTile
