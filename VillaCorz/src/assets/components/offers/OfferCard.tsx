import { useState } from 'react'
import { ImageOff, Pencil, Trash2 } from 'lucide-react'
import { money } from '../../../lib/format'
import type { Service } from '../../../services/types'

type OfferCardProps = {
    service: Service
    onEdit: (service: Service) => void
    onDelete: (service: Service) => void
}

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006dfc]'

const OfferCard = ({ service, onEdit, onDelete }: OfferCardProps) => {
    const images = service.images ?? []
    const primaryImage =
        images.find((image) => image.is_primary) ?? images[0] ?? null
    const [activeImageId, setActiveImageId] = useState<number | null>(
        primaryImage?.id ?? null,
    )
    const activeImage =
        images.find((image) => image.id === activeImageId) ?? primaryImage
    const isActive = service.status === 'active'

    return (
        <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:border-[#006dfc]/40 hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                {activeImage ? (
                    <img
                        src={activeImage.image_url}
                        alt={`${service.name} image`}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                        <ImageOff className="size-8" aria-hidden="true" />
                        <span className="text-xs font-medium">No image yet</span>
                    </div>
                )}

                <span
                    className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ${
                        isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-slate-100 text-slate-600 ring-slate-200'
                    }`}
                >
                    <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${
                            isActive ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                    />
                    {isActive ? 'Active' : 'Inactive'}
                </span>

                {images.length > 0 && (
                    <span className="absolute right-3 top-3 rounded-full bg-slate-950/65 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                        {images.length} {images.length === 1 ? 'image' : 'images'}
                    </span>
                )}
            </div>

            {images.length > 1 && (
                <div
                    aria-label={`${service.name} images`}
                    className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3"
                >
                    {images.map((image, index) => {
                        const isSelected = image.id === activeImage?.id

                        return (
                            <button
                                key={image.id}
                                type="button"
                                onClick={() => setActiveImageId(image.id)}
                                aria-label={`Show image ${index + 1} of ${service.name}`}
                                aria-pressed={isSelected}
                                className={`relative size-12 shrink-0 overflow-hidden rounded-lg ring-2 transition ${focusRing} ${
                                    isSelected
                                        ? 'ring-[#006dfc]'
                                        : 'ring-transparent hover:ring-slate-200'
                                }`}
                            >
                                <img
                                    src={image.image_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                                {image.is_primary && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute right-1 top-1 size-1.5 rounded-full bg-white shadow-sm"
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>
            )}

            <div className="flex flex-1 flex-col p-5">
                <h2 className="font-serif text-xl font-bold leading-tight text-[#003079]">
                    {service.name}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                    {service.description?.trim() ||
                        'No description has been added for this offer yet.'}
                </p>

                <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Price
                        </p>
                        <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#003079]">
                            {money(Number(service.price))}
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onEdit(service)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#006dfc]/40 hover:bg-[#006dfc]/5 hover:text-[#006dfc] ${focusRing}`}
                        >
                            <Pencil className="size-3.5" aria-hidden="true" />
                            Edit
                        </button>
                        <button
                            type="button"
                            onClick={() => onDelete(service)}
                            aria-label={`Delete ${service.name}`}
                            className={`inline-grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 ${focusRing}`}
                        >
                            <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </article>
    )
}

export default OfferCard
