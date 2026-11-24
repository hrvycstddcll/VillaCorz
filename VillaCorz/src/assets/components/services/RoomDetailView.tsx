import { Fan } from 'lucide-react'
import { money } from '../../../lib/format'
const airConditioningIcon = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364138/villacorz/ui/src/assets/images/AC.png'
const tvIcon = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364143/villacorz/ui/src/assets/images/Tv.png'
const privateBathroomIcon = 'https://res.cloudinary.com/ql4hruc3/image/upload/v1795364142/villacorz/ui/src/assets/images/Cr.png'
import { amenityIcon, stayCategoryConflictMessage, type Stay } from './shared'

export function RoomDetailView({
    stay,
    selectedPhoto,
    isReservationSelected,
    reservationBlocked = false,
    onReserve,
    onSelectPhoto,
    onBack,
}: {
    stay: Stay
    selectedPhoto: string
    isReservationSelected: boolean
    reservationBlocked?: boolean
    onReserve: () => void
    onSelectPhoto: (photo: string) => void
    onBack: () => void
}) {
    const titleId = `${stay.id}-detail-title`
    const gallery = stay.gallery.slice(0, 3)
    const hasAmenities = stay.amenities.length > 0

    return (
        <section aria-labelledby={titleId} className="mb-8 font-poppins">
            <button
                type="button"
                onClick={onBack}
                className="mb-3 inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-medium text-slate-600 transition-colors sm:text-sm md:text-xs lg:text-base hover:bg-white hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]"
            >
                Back to rooms
            </button>
            <div className="grid overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.12)] md:grid-cols-[minmax(0,1.6fr)_minmax(220px,1fr)] lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
                {selectedPhoto ? (
                    <img
                        src={selectedPhoto}
                        alt={`${stay.title} interior`}
                        className="aspect-[1.65] h-full w-full object-cover md:aspect-auto md:min-h-[240px] lg:min-h-[300px]"
                    />
                ) : (
                    <div className="grid min-h-56 place-items-center bg-slate-100 text-xs text-slate-500 sm:text-sm md:min-h-[240px] md:text-xs lg:min-h-[300px] lg:text-base">
                        Photo unavailable
                    </div>
                )}
                <div className="flex min-w-0 flex-col p-4 sm:p-5 md:p-3.5">
                    <div>
                        <h2
                            id={titleId}
                            className="font-jakarta text-xl font-bold leading-tight text-[#006dfc] sm:text-2xl md:text-xl lg:text-3xl"
                        >
                            {stay.title}
                        </h2>
                        <p className="mt-1 text-xs text-slate-600 sm:text-sm md:text-xs lg:text-base">
                            {stay.capacity}
                        </p>
                        {stay.pax != null &&
                            (stay.additionalHeadWeekdayPrice ?? 0) > 0 &&
                            (stay.additionalHeadWeekendPrice ?? 0) > 0 && (
                                <p className="mt-1 text-[13px] leading-relaxed text-slate-500 sm:text-sm md:text-xs lg:text-base">
                                    Additional guest:{' '}
                                    {money(
                                        stay.additionalHeadWeekdayPrice ?? 0,
                                    )}{' '}
                                    weekday /{' '}
                                    {money(
                                        stay.additionalHeadWeekendPrice ?? 0,
                                    )}{' '}
                                    weekend per night
                                </p>
                            )}
                    </div>

                    {hasAmenities && (
                        <div className="mt-4">
                            <h3 className="font-jakarta text-sm font-semibold text-slate-700 sm:text-base md:text-sm lg:text-lg">
                                Room Features
                            </h3>
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-2 text-xs font-semibold text-emerald-700 sm:text-sm md:text-xs lg:text-base">
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

                    <p className="mt-6 text-[13px] leading-relaxed text-slate-600 sm:text-sm md:text-xs lg:text-base">
                        {stay.description}
                    </p>

                    <button
                        type="button"
                        onClick={onReserve}
                        disabled={isReservationSelected || reservationBlocked}
                        title={
                            reservationBlocked && !isReservationSelected
                                ? stayCategoryConflictMessage(stay)
                                : undefined
                        }
                        className={`mt-5 min-h-11 rounded-lg bg-[#006dfc] px-4 text-[13px] font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc] sm:text-sm md:text-xs lg:text-base ${
                            reservationBlocked && !isReservationSelected
                                ? 'disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500'
                                : 'disabled:cursor-not-allowed disabled:bg-emerald-700'
                        }`}
                    >
                        {isReservationSelected
                            ? 'Added to booking'
                            : reservationBlocked
                              ? 'Blocked'
                              : 'Add to booking'}
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
